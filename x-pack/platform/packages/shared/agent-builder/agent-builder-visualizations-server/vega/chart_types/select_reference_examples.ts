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
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { vegaLiteReferenceTypes } from '../chart_type_registry';
import type { VegaLiteChartTypeEntry } from './types';

/** Adapter shape used by load/format helpers (Lens-like selection metadata + load). */
export interface VegaReferenceExample {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly load: () => Promise<Record<string, unknown>>;
}

export interface LoadedVegaReferenceExample {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly spec: Record<string, unknown>;
}

const toReferenceExample = (entry: VegaLiteChartTypeEntry): VegaReferenceExample => ({
  id: entry.id,
  title: entry.prompt.selection.title,
  description: entry.prompt.selection.description,
  load: entry.example.load,
});

/** @deprecated Use vegaLiteReferenceTypes from chart_type_registry */
export const VEGA_REFERENCE_EXAMPLES: readonly VegaReferenceExample[] =
  vegaLiteReferenceTypes.map(toReferenceExample);

const MAX_SELECTED_EXAMPLES = 2;

const exampleById = (id: string): VegaReferenceExample | undefined =>
  VEGA_REFERENCE_EXAMPLES.find((example) => example.id === id);

export const formatReferenceCatalog = (): string =>
  VEGA_REFERENCE_EXAMPLES.map(
    (example) => `- id: "${example.id}" — ${example.title}\n  ${example.description}`
  ).join('\n');

const referenceSelectionSchema = z.object({
  exampleIds: z
    .array(z.string())
    .default([])
    .describe(
      'IDs (from the catalog) of the reference examples whose STRUCTURE matches the request. Order by relevance. Use an empty array when none apply — e.g. a plain single-series bar/line chart, which needs no example.'
    ),
});

export const createExampleSelectorPrompt = ({
  nlQuery,
  chartType,
}: {
  nlQuery: string;
  chartType?: SupportedChartType;
}): BaseMessageLike[] => {
  const chartTypeHint = chartType ? `\nSuggested chart style: "${chartType}".` : '';

  return [
    [
      'system',
      `You are a Vega-Lite visualization expert selecting reference examples for a chart-authoring model.

You are given a catalog of curated Vega-Lite example shapes and a chart request. Decide which example(s), if any, illustrate the STRUCTURE the request needs, and return their ids by calling the 'select_reference_examples' tool.

RULES:
1. Match on the chart's SHAPE/structure (combination, facet, scatter/bubble, heatmap, timeline, calendar), NOT on the specific fields or data in the request.
2. Select at most ${MAX_SELECTED_EXAMPLES}, ordered by relevance. Most requests need zero or one.
3. Return an EMPTY array when no example fits — e.g. a plain single-series bar or line chart. Do NOT force an unrelated example.
4. Only return ids that appear verbatim in the catalog.

CATALOG:
${formatReferenceCatalog()}`,
    ],
    [
      'human',
      `Chart request:
<user_query>
${nlQuery}
</user_query>${chartTypeHint}

Call 'select_reference_examples' with the ids of the matching example(s), or an empty array if none apply.`,
    ],
  ];
};

// Best-effort: any failure yields an empty selection so authoring is not blocked.
export const selectReferenceExamples = async ({
  nlQuery,
  chartType,
  model,
  logger,
}: {
  nlQuery: string;
  chartType?: SupportedChartType;
  model: ScopedModel;
  logger?: Logger;
}): Promise<VegaReferenceExample[]> => {
  try {
    const selectorModel = model.chatModel.withStructuredOutput(referenceSelectionSchema, {
      name: 'select_reference_examples',
    });

    const response = await selectorModel.invoke(
      createExampleSelectorPrompt({ nlQuery, chartType })
    );
    const requestedIds = Array.isArray(response?.exampleIds) ? response.exampleIds : [];

    const selected: VegaReferenceExample[] = [];
    for (const id of requestedIds) {
      const example = exampleById(id);
      if (example && !selected.includes(example)) {
        selected.push(example);
      }
      if (selected.length >= MAX_SELECTED_EXAMPLES) {
        break;
      }
    }

    return selected;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger?.warn(`Reference-example selection failed; authoring without examples: ${message}`);
    return [];
  }
};

export const loadReferenceExamples = async (
  examples: readonly VegaReferenceExample[]
): Promise<LoadedVegaReferenceExample[]> =>
  Promise.all(
    examples.map(async ({ id, title, description, load }) => ({
      id,
      title,
      description,
      spec: await load(),
    }))
  );

export const formatReferenceExamples = (examples: LoadedVegaReferenceExample[]): string => {
  if (examples.length === 0) {
    return '';
  }

  const blocks = examples
    .map(
      (example) =>
        `### ${example.title}\n${example.description}\n\`\`\`json\n${JSON.stringify(
          example.spec,
          null,
          2
        )}\n\`\`\``
    )
    .join('\n\n');

  return `
REFERENCE EXAMPLES:
Adapt the structural pattern(s) below to the request. Do NOT copy their data source, fields, or query — bind the columns listed above. They illustrate correct Vega-Lite structure for the response "spec" field (set the panel title on response "title").

${blocks}`;
};

export const buildReferenceExamplesBlock = async ({
  nlQuery,
  chartType,
  model,
  logger,
}: {
  nlQuery: string;
  chartType?: SupportedChartType;
  model: ScopedModel;
  logger?: Logger;
}): Promise<string> => {
  const selected = await selectReferenceExamples({ nlQuery, chartType, model, logger });
  if (selected.length === 0) {
    return '';
  }
  try {
    return formatReferenceExamples(await loadReferenceExamples(selected));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger?.warn(`Reference-example loading failed; authoring without examples: ${message}`);
    return '';
  }
};

/** Build a Raw Vega reference block from a registry chart type entry. */
export const formatRawChartTypeExample = async (
  entry: {
    prompt: { selection: { title: string; description: string } };
    example: { load: () => Promise<Record<string, unknown>>; description?: string };
  }
): Promise<string> => {
  const loaded = await loadReferenceExamples([
    {
      id: entry.prompt.selection.title,
      title: entry.prompt.selection.title,
      description: entry.example.description ?? entry.prompt.selection.description,
      load: entry.example.load,
    },
  ]);
  return formatReferenceExamples(loaded);
};
