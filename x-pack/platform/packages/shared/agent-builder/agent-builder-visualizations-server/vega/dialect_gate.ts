/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { Logger } from '@kbn/logging';
import type { ScopedModel } from '@kbn/agent-builder-server';
import {
  dialectFromSpec,
  inferRawVegaCatalogId,
  isRawVegaCatalogId,
  type VegaCatalogId,
} from './dialect';
import { getRawVegaChartType, rawVegaChartTypes } from './chart_type_registry';
import { formatRawChartTypeExample } from './chart_types/select_reference_examples';

const catalogSelectionSchema = z.object({
  catalogId: z
    .enum(['sunburst', 'radar', 'sankey', 'none'])
    .describe(
      'Allowlisted Raw Vega catalog id when the request clearly needs that chart; otherwise "none".'
    ),
});

export const createCatalogSelectorPrompt = ({
  nlQuery,
}: {
  nlQuery: string;
}): BaseMessageLike[] => [
  [
    'system',
    `You classify whether a visualization request needs an allowlisted Raw Vega chart.

Return a catalog id by calling the 'select_vega_catalog' tool.

ALLOWLIST:
${rawVegaChartTypes
  .map((entry) => `- id: "${entry.id}" — ${entry.prompt.selection.description}`)
  .join('\n')}

RULES:
${rawVegaChartTypes
  .map((entry, index) => {
    // selection.guideline is "Choose <id> when …" → "Return "<id>" ONLY when …"
    const whenClause = entry.prompt.selection.guideline.replace(/^Choose \S+ when\s+/i, '');
    return `${index + 1}. Return "${entry.id}" ONLY when ${whenClause}`;
  })
  .join('\n')}
${
  rawVegaChartTypes.length + 1
}. Return "none" for Vega-Lite charts (bars, lines, facets, scatter, heatmap, gantt, …) and for unsupported Raw Vega diagrams (network, chord, …).
${
  rawVegaChartTypes.length + 2
}. Do NOT return "sunburst" for Lens treemap/pie/donut requests unless the user explicitly asks for a sunburst.
${
  rawVegaChartTypes.length + 3
}. Do NOT return "radar" for pie/donut/radial-bar requests unless the user explicitly asks for a radar or spider chart.
${
  rawVegaChartTypes.length + 4
}. Do NOT return "sankey" for ordinary bar/line breakdowns unless the user asks for Sankey, flow, or alluvial.
${rawVegaChartTypes.length + 5}. Only return ids from the allowlist or "none".`,
  ],
  [
    'human',
    `Chart request:
<user_query>
${nlQuery}
</user_query>

Call 'select_vega_catalog' with the matching catalog id, or "none".`,
  ],
];

/** Best-effort Dialect gate; failures yield `none` so authoring is not blocked. */
export const selectVegaCatalogId = async ({
  nlQuery,
  model,
  logger,
}: {
  nlQuery: string;
  model: ScopedModel;
  logger?: Logger;
}): Promise<VegaCatalogId> => {
  try {
    const selectorModel = model.chatModel.withStructuredOutput(catalogSelectionSchema, {
      name: 'select_vega_catalog',
    });
    const response = await selectorModel.invoke(createCatalogSelectorPrompt({ nlQuery }));
    const catalogId = response?.catalogId;
    return isRawVegaCatalogId(catalogId as VegaCatalogId)
      ? (catalogId as Exclude<VegaCatalogId, 'none'>)
      : 'none';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger?.warn(`Vega catalog selection failed; defaulting to Vega-Lite: ${message}`);
    return 'none';
  }
};

/** Load the curated Raw Vega reference block for a catalog id (empty when none). */
export const buildRawVegaReferenceBlock = async (catalogId: VegaCatalogId): Promise<string> => {
  const entry = getRawVegaChartType(catalogId);
  if (!entry) {
    return '';
  }
  return formatRawChartTypeExample(entry);
};

export interface DialectGateResult {
  catalogId: VegaCatalogId;
  /** Authoring Dialect after the gate (and edit pin) resolves. */
  dialect: 'vega-lite' | 'vega';
  /** Preloaded Raw Vega reference block when an allowlisted catalog is selected. */
  referenceExamples: string;
}

/**
 * Resolve Dialect for a create or edit:
 * - edits pin Dialect from the stored `$schema` (skip classifier for Dialect),
 *   and resolve catalog from the existing spec (fallback: classifier),
 * - creates run the catalog classifier; allowlisted id → Raw Vega + example.
 */
export const resolveDialectGate = async ({
  nlQuery,
  existingSpec,
  model,
  logger,
}: {
  nlQuery: string;
  existingSpec?: string;
  model: ScopedModel;
  logger?: Logger;
}): Promise<DialectGateResult> => {
  if (existingSpec) {
    const dialect = dialectFromSpec(existingSpec);
    if (dialect === 'vega') {
      let catalogId = inferRawVegaCatalogId(existingSpec);
      if (catalogId === 'none') {
        // Structural cue missing (unusual); classify among allowlisted charts.
        // Keep `none` when classification also misses — stay on Raw Vega dialect
        // with shared authoring rules + the existing spec (do not guess sunburst).
        catalogId = await selectVegaCatalogId({ nlQuery, model, logger });
      }
      return {
        catalogId,
        dialect: 'vega',
        referenceExamples: await buildRawVegaReferenceBlock(catalogId),
      };
    }
    return { catalogId: 'none', dialect: 'vega-lite', referenceExamples: '' };
  }

  const catalogId = await selectVegaCatalogId({ nlQuery, model, logger });
  if (isRawVegaCatalogId(catalogId)) {
    return {
      catalogId,
      dialect: 'vega',
      referenceExamples: await buildRawVegaReferenceBlock(catalogId),
    };
  }
  return { catalogId: 'none', dialect: 'vega-lite', referenceExamples: '' };
};
