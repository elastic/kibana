/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { ExtractedVisualization } from '../extract_visualization';
import {
  extractGoldQuery,
  hasStructuralGoldConfig,
  type VisualizationGoldConfig,
  type VisualizationGoldLayer,
} from './gold_visualization_config';
import { columnsReferToSameExpression } from './resolve_esql_column';

export const VISUALIZATION_CONFIG_VS_INTENT_EVALUATOR_NAME = 'Visualization Config vs Intent';

const SCATTER_MARKS = new Set(['point', 'circle']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * CODE evaluator: subset-matches the example's gold Lens/Vega config against
 * the generated visualization. Scores semantic fields (chart type, layer type,
 * column roles) and ignores titles, styling, and column alias wording.
 */
export function createVisualizationConfigVsIntentEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  visualizationExtractor: (output: TTaskOutput) => ExtractedVisualization[];
  expectedConfigExtractor: (expected: TExample['output']) => VisualizationGoldConfig | undefined;
  expectedQueryExtractor?: (expected: TExample['output']) => string;
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const {
    visualizationExtractor,
    expectedConfigExtractor,
    expectedQueryExtractor,
    name = VISUALIZATION_CONFIG_VS_INTENT_EVALUATOR_NAME,
  } = config;

  return {
    name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      const goldConfig = expectedConfigExtractor(expected);
      if (!goldConfig || !hasStructuralGoldConfig(goldConfig)) {
        return {
          score: 1,
          label: 'skipped',
          explanation: 'No structural gold config declared for this example.',
        };
      }

      let visualizations: ExtractedVisualization[];
      try {
        visualizations = visualizationExtractor(output);
      } catch (err) {
        return {
          score: 0,
          label: 'error',
          explanation: `Visualization extractor threw: ${(err as Error).message}`,
        };
      }

      if (visualizations.length === 0) {
        return {
          score: 0,
          label: 'no-visualization',
          explanation: 'No visualization produced to compare against the gold config.',
        };
      }

      const goldQuery = expectedQueryExtractor?.(expected) || extractGoldQuery(expected);
      const details = visualizations.map((visualization, index) => {
        const { matched, mismatches } = matchGoldConfig(goldConfig, visualization, goldQuery);
        return {
          index,
          matched,
          mismatches,
          actualChartType: visualization.chartType ?? null,
          renderer: visualization.renderer ?? null,
        };
      });

      const matchedCount = details.filter((detail) => detail.matched).length;
      const score = matchedCount / details.length;

      return {
        score,
        label: score === 1 ? 'match' : score === 0 ? 'mismatch' : 'partial',
        explanation:
          score === 1
            ? `All ${details.length} visualization(s) matched the gold config.`
            : `${matchedCount}/${details.length} visualization(s) matched the gold config.`,
        metadata: {
          matchedCount,
          totalVisualizations: details.length,
          visualizations: details,
        },
      };
    },
  };
}

function matchGoldConfig(
  gold: VisualizationGoldConfig,
  visualization: ExtractedVisualization,
  goldQuery: string
): { matched: boolean; mismatches: string[] } {
  const mismatches: string[] = [];
  const actual = visualization.visualization ?? {};
  const actualQuery = visualization.esql;

  if ('type' in gold && gold.type !== undefined) {
    const actualType = typeof actual.type === 'string' ? actual.type : visualization.chartType;
    if (!matchesAny(actualType, gold.type)) {
      mismatches.push(
        `type: expected ${formatExpected(gold.type)}, got ${actualType ?? 'undefined'}`
      );
    }
  }

  if ('layers' in gold && Array.isArray(gold.layers)) {
    matchLayers(gold.layers, actual.layers, goldQuery, actualQuery, mismatches);
  }

  matchColumnRole(
    'metrics',
    'metrics' in gold ? gold.metrics : undefined,
    actual.metrics,
    goldQuery,
    actualQuery,
    mismatches
  );
  matchColumnRole(
    'metric',
    'metric' in gold ? gold.metric : undefined,
    actual.metric,
    goldQuery,
    actualQuery,
    mismatches
  );
  matchColumnRole(
    'group_by',
    'group_by' in gold ? gold.group_by : undefined,
    actual.group_by,
    goldQuery,
    actualQuery,
    mismatches
  );
  matchColumnRole(
    'tag_by',
    'tag_by' in gold ? gold.tag_by : undefined,
    actual.tag_by,
    goldQuery,
    actualQuery,
    mismatches
  );
  matchColumnRole(
    'rows',
    'rows' in gold ? gold.rows : undefined,
    actual.rows,
    goldQuery,
    actualQuery,
    mismatches
  );
  matchAxes(gold, actual, goldQuery, actualQuery, mismatches);

  if ('spec' in gold && isRecord(gold.spec)) {
    matchVegaSpec(gold.spec, actual, goldQuery, actualQuery, mismatches);
  }

  return { matched: mismatches.length === 0, mismatches };
}

function matchLayers(
  goldLayers: VisualizationGoldLayer[],
  actualLayers: unknown,
  goldQuery: string,
  actualQuery: string,
  mismatches: string[]
): void {
  if (!Array.isArray(actualLayers) || actualLayers.length < goldLayers.length) {
    mismatches.push(
      `layers: expected at least ${goldLayers.length}, got ${
        Array.isArray(actualLayers) ? actualLayers.length : 0
      }`
    );
    return;
  }

  const used = new Set<number>();
  goldLayers.forEach((goldLayer, goldIndex) => {
    const matchIndex = actualLayers.findIndex((candidate, actualIndex) => {
      if (used.has(actualIndex) || !isRecord(candidate)) {
        return false;
      }
      return layerMatches(goldLayer, candidate, goldQuery, actualQuery).length === 0;
    });
    if (matchIndex < 0) {
      const firstActual = actualLayers.find((layer) => isRecord(layer));
      const sample = isRecord(firstActual)
        ? layerMatches(goldLayer, firstActual, goldQuery, actualQuery)
        : ['no actual layer'];
      mismatches.push(`layers[${goldIndex}]: ${sample.join('; ')}`);
      return;
    }
    used.add(matchIndex);
  });
}

function layerMatches(
  gold: VisualizationGoldLayer,
  actual: Record<string, unknown>,
  goldQuery: string,
  actualQuery: string
): string[] {
  const mismatches: string[] = [];
  if ('type' in gold && gold.type !== undefined) {
    const actualType = typeof actual.type === 'string' ? actual.type : undefined;
    if (!matchesAny(actualType, gold.type)) {
      mismatches.push(
        `type expected ${formatExpected(gold.type)}, got ${actualType ?? 'undefined'}`
      );
    }
  }
  matchColumnRole(
    'x',
    'x' in gold ? gold.x : undefined,
    actual.x,
    goldQuery,
    actualQuery,
    mismatches
  );
  matchColumnRole(
    'y',
    'y' in gold ? gold.y : undefined,
    actual.y,
    goldQuery,
    actualQuery,
    mismatches
  );
  matchColumnRole(
    'breakdown_by',
    'breakdown_by' in gold ? gold.breakdown_by : undefined,
    actual.breakdown_by,
    goldQuery,
    actualQuery,
    mismatches
  );
  return mismatches;
}

function matchAxes(
  gold: VisualizationGoldConfig,
  actual: Record<string, unknown>,
  goldQuery: string,
  actualQuery: string,
  mismatches: string[]
): void {
  if ('layers' in gold && Array.isArray(gold.layers)) {
    return;
  }
  if ('x' in gold && 'y' in gold && gold.x && gold.y) {
    const goldAxes = [readColumn(gold.x), readColumn(gold.y)].filter(
      (column): column is string => typeof column === 'string'
    );
    const actualAxes = [readColumn(actual.x), readColumn(actual.y)].filter(
      (column): column is string => typeof column === 'string'
    );
    const missing = findMissingColumns(goldAxes, actualAxes, goldQuery, actualQuery);
    if (missing.length > 0) {
      mismatches.push(`axes: missing ${missing.join(', ')}`);
    }
    return;
  }
  matchColumnRole(
    'x',
    'x' in gold ? gold.x : undefined,
    actual.x,
    goldQuery,
    actualQuery,
    mismatches
  );
  matchColumnRole(
    'y',
    'y' in gold ? gold.y : undefined,
    actual.y,
    goldQuery,
    actualQuery,
    mismatches
  );
}

function matchVegaSpec(
  goldSpec: Record<string, unknown>,
  actual: Record<string, unknown>,
  goldQuery: string,
  actualQuery: string,
  mismatches: string[]
): void {
  const actualSpec = readActualSpec(actual);
  if (!actualSpec) {
    mismatches.push('spec: actual visualization is missing a Vega spec');
    return;
  }

  const goldMark = readMark(goldSpec);
  const actualMark = readMark(actualSpec);
  if (goldMark && !marksEquivalent(goldMark, actualMark)) {
    mismatches.push(`spec.mark: expected ${goldMark}, got ${actualMark ?? 'undefined'}`);
  }

  if (!isRecord(goldSpec.encoding)) {
    return;
  }
  if (!isRecord(actualSpec.encoding)) {
    mismatches.push('spec.encoding: actual spec is missing encoding');
    return;
  }

  for (const [channel, goldEncoding] of Object.entries(goldSpec.encoding)) {
    const goldField = readColumn(goldEncoding);
    if (!goldField) {
      continue;
    }
    const actualField = readColumn(actualSpec.encoding[channel]);
    if (!actualField) {
      mismatches.push(`spec.encoding.${channel}: missing field`);
      continue;
    }
    if (!columnsReferToSameExpression(goldField, goldQuery, actualField, actualQuery)) {
      mismatches.push(`spec.encoding.${channel}: expected ${goldField}, got ${actualField}`);
    }
  }
}

function matchColumnRole(
  role: string,
  gold: unknown,
  actual: unknown,
  goldQuery: string,
  actualQuery: string,
  mismatches: string[]
): void {
  if (gold === undefined) {
    return;
  }
  const goldColumns = readColumnList(gold);
  if (goldColumns.length === 0) {
    return;
  }
  const actualColumns = readColumnList(actual);
  const missing = findMissingColumns(goldColumns, actualColumns, goldQuery, actualQuery);
  if (missing.length > 0) {
    mismatches.push(`${role}: missing ${missing.join(', ')}`);
  }
}

function findMissingColumns(
  goldColumns: string[],
  actualColumns: string[],
  goldQuery: string,
  actualQuery: string
): string[] {
  const unused = [...actualColumns];
  const missing: string[] = [];
  for (const goldColumn of goldColumns) {
    const matchIndex = unused.findIndex((actualColumn) =>
      columnsReferToSameExpression(goldColumn, goldQuery, actualColumn, actualQuery)
    );
    if (matchIndex < 0) {
      missing.push(goldColumn);
      continue;
    }
    unused.splice(matchIndex, 1);
  }
  return missing;
}

function readColumnList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => readColumn(item))
      .filter((column): column is string => typeof column === 'string');
  }
  const column = readColumn(value);
  return column ? [column] : [];
}

function readColumn(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.column === 'string' && value.column.trim().length > 0) {
    return value.column;
  }
  if (typeof value.field === 'string' && value.field.trim().length > 0) {
    return value.field;
  }
  return undefined;
}

function readActualSpec(
  visualization: Record<string, unknown>
): Record<string, unknown> | undefined {
  const spec = visualization.spec;
  if (isRecord(spec)) {
    return spec;
  }
  if (typeof spec !== 'string') {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(spec);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function readMark(spec: Record<string, unknown>): string | undefined {
  if (typeof spec.mark === 'string' && spec.mark.trim().length > 0) {
    return spec.mark.trim().toLowerCase();
  }
  if (isRecord(spec.mark) && typeof spec.mark.type === 'string') {
    return spec.mark.type.trim().toLowerCase();
  }
  return undefined;
}

function marksEquivalent(gold: string, actual: string | undefined): boolean {
  if (!actual) {
    return false;
  }
  if (gold === actual) {
    return true;
  }
  return SCATTER_MARKS.has(gold) && SCATTER_MARKS.has(actual);
}

function matchesAny(actual: string | undefined, expected: string | readonly string[]): boolean {
  if (!actual) {
    return false;
  }
  const expectedValues = (Array.isArray(expected) ? expected : [expected]).map((value) =>
    value.trim().toLowerCase()
  );
  return expectedValues.includes(actual.trim().toLowerCase());
}

function formatExpected(expected: string | readonly string[]): string {
  return typeof expected === 'string' ? expected : expected.join(' | ');
}
