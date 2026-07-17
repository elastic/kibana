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
import { formatReferenceExamples, loadReferenceExamples } from './reference_examples';
import type { VegaReferenceExample } from './reference_examples';

/** Allowlisted Raw Vega catalog entries the classifier may return. */
const RAW_VEGA_CATALOG: ReadonlyArray<{ id: Exclude<VegaCatalogId, 'none'>; description: string }> =
  [
    {
      id: 'sunburst',
      description:
        'Radial hierarchy / sunburst / ring partition of a parent-child tree (not a treemap, pie, or donut).',
    },
    {
      id: 'radar',
      description:
        'Radar / spider / polar multivariate chart comparing numeric measures across several axes (not a pie or radial bar).',
    },
  ];

const catalogSelectionSchema = z.object({
  catalogId: z
    .enum(['sunburst', 'radar', 'none'])
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
${RAW_VEGA_CATALOG.map((entry) => `- id: "${entry.id}" — ${entry.description}`).join('\n')}

RULES:
1. Return "sunburst" ONLY when the user clearly wants a sunburst / radial hierarchy / ring partition of a tree.
2. Return "radar" ONLY when the user clearly wants a radar / spider / polar multivariate chart across several numeric axes.
3. Return "none" for Vega-Lite charts (bars, lines, facets, scatter, heatmap, gantt, …) and for unsupported Raw Vega diagrams (Sankey, network, chord, …).
4. Do NOT return "sunburst" for Lens treemap/pie/donut requests unless the user explicitly asks for a sunburst.
5. Do NOT return "radar" for pie/donut/radial-bar requests unless the user explicitly asks for a radar or spider chart.
6. Only return ids from the allowlist or "none".`,
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

const SUNBURST_EXAMPLE: VegaReferenceExample = {
  id: 'sunburst',
  title: 'Sunburst / hierarchy (Raw Vega partition)',
  description:
    'Static radial hierarchy: Parent–child table (parent rows AND leaves — every parent id must exist as an id) → `stratify` + `partition` → `arc` marks. Bind the Canonical ES|QL source named `source`; do not add Kibana interaction signals.',
  load: () => import('./reference_examples/sunburst').then((module) => module.spec),
};

const RADAR_EXAMPLE: VegaReferenceExample = {
  id: 'radar',
  title: 'Radar / spider (Raw Vega polar)',
  description:
    'Static radar: key/value rows (≥3 distinct keys; optional series) → angular + radial scales → faceted `line` marks with `linear-closed`. Bind the Canonical ES|QL source named `source`; do not add Kibana interaction signals.',
  load: () => import('./reference_examples/radar').then((module) => module.spec),
};

const RAW_VEGA_EXAMPLES: Record<Exclude<VegaCatalogId, 'none'>, VegaReferenceExample> = {
  sunburst: SUNBURST_EXAMPLE,
  radar: RADAR_EXAMPLE,
};

/** Load the curated Raw Vega reference block for a catalog id (empty when none). */
export const buildRawVegaReferenceBlock = async (catalogId: VegaCatalogId): Promise<string> => {
  if (!isRawVegaCatalogId(catalogId)) {
    return '';
  }
  return formatReferenceExamples(await loadReferenceExamples([RAW_VEGA_EXAMPLES[catalogId]]));
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
        catalogId = await selectVegaCatalogId({ nlQuery, model, logger });
        if (!isRawVegaCatalogId(catalogId)) {
          // Still Raw Vega edit — default to sunburst so ES|QL/author stay Raw Vega.
          catalogId = 'sunburst';
        }
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
