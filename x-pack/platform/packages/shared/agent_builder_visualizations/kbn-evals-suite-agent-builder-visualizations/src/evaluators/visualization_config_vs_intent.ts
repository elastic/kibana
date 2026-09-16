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
} from './gold_visualization_config';
import { columnsReferToSameExpression } from './resolve_esql_column';

export const VISUALIZATION_CONFIG_VS_INTENT_EVALUATOR_NAME = 'Visualization Config vs Intent';

const SCATTER_MARKS = new Set(['point', 'circle']);
const SKIP_KEYS = new Set(['data_source']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * CODE evaluator: subset-matches gold Config API against the generated
 * visualization. Extra actual fields, titles, styling, and column alias wording
 * are ignored. New gold keys are scored automatically.
 */
export function createVisualizationConfigVsIntentEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  visualizationExtractor: (output: TTaskOutput) => ExtractedVisualization[];
  expectedConfigExtractor: (expected: TExample['output']) => VisualizationGoldConfig | undefined;
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const {
    visualizationExtractor,
    expectedConfigExtractor,
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

      const goldQuery = extractGoldQuery(expected);
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
  matchValue(gold, actualConfig(visualization), '', goldQuery, visualization.esql, mismatches);
  return { matched: mismatches.length === 0, mismatches };
}

function actualConfig(visualization: ExtractedVisualization): Record<string, unknown> {
  const actual: Record<string, unknown> = { ...(visualization.visualization ?? {}) };
  if (typeof actual.type !== 'string' && visualization.chartType) {
    actual.type = visualization.chartType;
  }
  if (typeof actual.spec === 'string') {
    try {
      const parsed: unknown = JSON.parse(actual.spec);
      if (isRecord(parsed)) {
        actual.spec = parsed;
      }
    } catch {
      // Leave the string; subset matching will fail against an object gold spec.
    }
  }
  return actual;
}

function matchValue(
  gold: unknown,
  actual: unknown,
  path: string,
  goldQuery: string,
  actualQuery: string,
  mismatches: string[]
): void {
  if (gold === undefined) {
    return;
  }
  if (typeof gold === 'string' || typeof gold === 'number' || typeof gold === 'boolean') {
    if (gold !== actual && String(gold).toLowerCase() !== String(actual ?? '').toLowerCase()) {
      mismatches.push(`${path || 'value'}: expected ${String(gold)}, got ${String(actual)}`);
    }
    return;
  }
  if (Array.isArray(gold)) {
    matchArray(gold, actual, path, goldQuery, actualQuery, mismatches);
    return;
  }
  if (!isRecord(gold)) {
    return;
  }
  matchObject(gold, actual, path, goldQuery, actualQuery, mismatches);
}

function matchObject(
  gold: Record<string, unknown>,
  actual: unknown,
  path: string,
  goldQuery: string,
  actualQuery: string,
  mismatches: string[]
): void {
  const goldColumn = readColumn(gold);
  if (goldColumn && isColumnBinding(gold)) {
    const actualColumn = readColumn(actual);
    if (!actualColumn) {
      mismatches.push(`${path}: missing column`);
      return;
    }
    if (!columnsReferToSameExpression(goldColumn, goldQuery, actualColumn, actualQuery)) {
      mismatches.push(`${path}: expected ${goldColumn}, got ${actualColumn}`);
    }
    return;
  }

  if (!isRecord(actual)) {
    mismatches.push(`${path || 'config'}: actual is missing`);
    return;
  }

  if (hasUnorderedAxes(gold)) {
    matchUnorderedAxes(gold, actual, path, goldQuery, actualQuery, mismatches);
  }

  for (const [key, goldChild] of Object.entries(gold)) {
    if (goldChild === undefined || SKIP_KEYS.has(key)) {
      continue;
    }
    if (hasUnorderedAxes(gold) && (key === 'x' || key === 'y')) {
      continue;
    }
    const childPath = path ? `${path}.${key}` : key;
    if (key === 'type' || key === 'mark') {
      matchTypeOrMark(goldChild, actual[key], childPath, mismatches);
      continue;
    }
    matchValue(goldChild, actual[key], childPath, goldQuery, actualQuery, mismatches);
  }
}

function hasUnorderedAxes(gold: Record<string, unknown>): boolean {
  return (
    gold.layers === undefined &&
    !Array.isArray(gold.x) &&
    !Array.isArray(gold.y) &&
    readColumn(gold.x) !== undefined &&
    readColumn(gold.y) !== undefined
  );
}

function matchUnorderedAxes(
  gold: Record<string, unknown>,
  actual: Record<string, unknown>,
  path: string,
  goldQuery: string,
  actualQuery: string,
  mismatches: string[]
): void {
  const goldAxes = [readColumn(gold.x), readColumn(gold.y)].filter(
    (column): column is string => typeof column === 'string'
  );
  if (goldAxes.length === 0) {
    return;
  }
  const actualAxes = [readColumn(actual.x), readColumn(actual.y)].filter(
    (column): column is string => typeof column === 'string'
  );
  const missing = findMissingColumns(goldAxes, actualAxes, goldQuery, actualQuery);
  if (missing.length > 0) {
    mismatches.push(`${path ? `${path}.` : ''}axes: missing ${missing.join(', ')}`);
  }
}

function matchArray(
  gold: unknown[],
  actual: unknown,
  path: string,
  goldQuery: string,
  actualQuery: string,
  mismatches: string[]
): void {
  if (gold.every((item) => typeof item === 'string')) {
    matchTypeOrMark(gold, actual, path, mismatches);
    return;
  }
  if (!Array.isArray(actual) || actual.length < gold.length) {
    mismatches.push(
      `${path}: expected at least ${gold.length}, got ${Array.isArray(actual) ? actual.length : 0}`
    );
    return;
  }
  const used = new Set<number>();
  gold.forEach((goldItem, goldIndex) => {
    const matchIndex = actual.findIndex((candidate, actualIndex) => {
      if (used.has(actualIndex)) {
        return false;
      }
      const nested: string[] = [];
      matchValue(goldItem, candidate, `${path}[${goldIndex}]`, goldQuery, actualQuery, nested);
      return nested.length === 0;
    });
    if (matchIndex < 0) {
      const nested: string[] = [];
      matchValue(goldItem, actual[0], `${path}[${goldIndex}]`, goldQuery, actualQuery, nested);
      mismatches.push(
        nested.length > 0 ? nested.join('; ') : `${path}[${goldIndex}]: no matching item`
      );
      return;
    }
    used.add(matchIndex);
  });
}

function matchTypeOrMark(gold: unknown, actual: unknown, path: string, mismatches: string[]): void {
  const expected = asTypeAlternatives(gold);
  if (!expected) {
    return;
  }
  const actualType = readTypeOrMark(actual);
  if (!matchesAny(actualType, expected)) {
    mismatches.push(
      `${path}: expected ${formatExpected(expected)}, got ${actualType ?? 'undefined'}`
    );
  }
}

function readTypeOrMark(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().toLowerCase();
  }
  if (isRecord(value) && typeof value.type === 'string') {
    return value.type.trim().toLowerCase();
  }
  return undefined;
}

function asTypeAlternatives(value: unknown): string | string[] | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.every((item): item is string => typeof item === 'string')) {
    return value;
  }
  return undefined;
}

function isColumnBinding(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => key === 'column' || key === 'field');
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

function matchesAny(actual: string | undefined, expected: string | readonly string[]): boolean {
  if (!actual) {
    return false;
  }
  const expectedValues = (Array.isArray(expected) ? expected : [expected]).map((value) =>
    value.trim().toLowerCase()
  );
  if (expectedValues.includes(actual.trim().toLowerCase())) {
    return true;
  }
  return (
    SCATTER_MARKS.has(actual.trim().toLowerCase()) &&
    expectedValues.some((value) => SCATTER_MARKS.has(value))
  );
}

function formatExpected(expected: string | readonly string[]): string {
  return typeof expected === 'string' ? expected : expected.join(' | ');
}
