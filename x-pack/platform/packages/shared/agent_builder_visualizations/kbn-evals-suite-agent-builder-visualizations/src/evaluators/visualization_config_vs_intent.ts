/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { ExtractedVisualization } from '../extract_visualization';
import { isRecord, skippedResult, unescapeVegaField } from '../evaluator_utils';
import {
  extractGoldQuery,
  hasStructuralGoldConfig,
  type VisualizationGoldConfig,
} from './gold_visualization_config';
import { columnsReferToSameExpression, resolveColumnExpression } from './resolve_esql_column';

export const VISUALIZATION_CONFIG_VS_INTENT_EVALUATOR_NAME = 'Visualization Config vs Intent';

const COLUMN_KEYS = new Set(['column', 'field']);
const LAYER_PATH = /^layers\[\d+\]$/;
const SPEC_LAYER_PATH = /^spec\.layer\[\d+\]$/;

// `data_source` is scored by the ES|QL evaluators. The chart form the Chart Type vs
// Intent judge owns is the root `type`, `layers[].type`, and the Vega `spec.mark` /
// `spec.layer[].mark`; a `type` anywhere else (e.g. `spec.encoding.x.type`) is an
// ordinary leaf.
const isSkippedKey = (path: string, key: string): boolean =>
  key === 'data_source' ||
  (key === 'type' && (path === '' || LAYER_PATH.test(path))) ||
  (key === 'mark' && (path === 'spec' || SPEC_LAYER_PATH.test(path)));

interface MatchReport {
  checked: number;
  mismatches: string[];
}

const createReport = (): MatchReport => ({ checked: 0, mismatches: [] });

const mergeReports = (target: MatchReport, source: MatchReport): void => {
  target.checked += source.checked;
  target.mismatches.push(...source.mismatches);
};

/**
 * CODE evaluator: subset-matches gold Config API against the generated
 * visualization and scores the fraction of gold leaf assertions that hold.
 * Leaves are `column` / `field` bindings (alias-tolerant) and string / number /
 * boolean / null values (strict equality). The chart form (root `type`,
 * `layers[].type`, `spec.mark`, `spec.layer[].mark`) is left to the Chart Type
 * vs Intent judge.
 * Keys absent from gold are never checked, so
 * titles, styling, and alias wording are ignored unless the gold spells them out.
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
        return skippedResult('No structural gold config declared for this example.');
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
        const report = createReport();
        matchValue(
          goldConfig,
          actualConfig(visualization),
          '',
          goldQuery,
          visualization.esql,
          report
        );
        const { checked, mismatches } = report;
        const matchedLeaves = checked - mismatches.length;
        return {
          index,
          score: checked === 0 ? 1 : matchedLeaves / checked,
          matchedLeaves,
          checkedLeaves: checked,
          mismatches,
          actualChartType: visualization.chartType ?? null,
          renderer: visualization.renderer ?? null,
        };
      });

      const score = details.reduce((sum, detail) => sum + detail.score, 0) / details.length;
      const matchedLeaves = details.reduce((sum, detail) => sum + detail.matchedLeaves, 0);
      const checkedLeaves = details.reduce((sum, detail) => sum + detail.checkedLeaves, 0);
      const mismatches = details.flatMap((detail) => detail.mismatches);

      if (checkedLeaves === 0) {
        return skippedResult(
          'Gold config declares only chart type / mark / data source, which other evaluators score.'
        );
      }

      return {
        score,
        label: score === 1 ? 'match' : score === 0 ? 'mismatch' : 'partial',
        explanation:
          score === 1
            ? `All ${checkedLeaves} gold assertion(s) held across ${details.length} visualization(s).`
            : `${matchedLeaves}/${checkedLeaves} gold assertion(s) held across ${
                details.length
              } visualization(s). Mismatches: ${mismatches.join('; ')}`,
        metadata: {
          matchedLeaves,
          checkedLeaves,
          totalVisualizations: details.length,
          visualizations: details,
        },
      };
    },
  };
}

function actualConfig(visualization: ExtractedVisualization): Record<string, unknown> {
  const actual: Record<string, unknown> = { ...(visualization.visualization ?? {}) };
  if (typeof actual.spec !== 'string') {
    return actual;
  }
  try {
    const parsed: unknown = JSON.parse(actual.spec);
    if (isRecord(parsed)) {
      actual.spec = parsed;
    }
  } catch {
    // Leave the string; subset matching will fail against an object gold spec.
  }
  return actual;
}

function matchValue(
  gold: unknown,
  actual: unknown,
  path: string,
  goldQuery: string,
  actualQuery: string,
  report: MatchReport
): void {
  if (gold === undefined) {
    return;
  }
  if (Array.isArray(gold)) {
    matchObjectArray(gold, actual, path, goldQuery, actualQuery, report);
    return;
  }
  if (isPrimitiveLeaf(gold) || typeof gold === 'string') {
    report.checked += 1;
    if (actual !== gold) {
      report.mismatches.push(
        `${path || 'value'}: expected ${JSON.stringify(gold)}, got ${JSON.stringify(actual)}`
      );
    }
    return;
  }
  if (!isRecord(gold)) {
    report.checked += 1;
    report.mismatches.push(`${path || 'value'}: unsupported gold value of type ${typeof gold}`);
    return;
  }

  const goldColumn = readColumn(gold);
  if (goldColumn) {
    report.checked += 1;
    const actualColumn = readColumn(actual);
    if (!actualColumn) {
      report.mismatches.push(`${path}: missing column`);
    } else if (!columnsReferToSameExpression(goldColumn, goldQuery, actualColumn, actualQuery)) {
      const goldExpression = resolveColumnExpression(goldColumn, goldQuery || actualQuery);
      const actualExpression = resolveColumnExpression(actualColumn, actualQuery || goldQuery);
      report.mismatches.push(
        `${path}: expected ${goldColumn} (${goldExpression}), got ${actualColumn} (${actualExpression})`
      );
    }
  }

  // A missing parent still recurses so every gold leaf below it is counted and reported.
  const actualRecord = isRecord(actual) ? actual : {};
  for (const [key, goldChild] of Object.entries(gold)) {
    if (
      goldChild === undefined ||
      isSkippedKey(path, key) ||
      (goldColumn && COLUMN_KEYS.has(key))
    ) {
      continue;
    }
    matchValue(
      goldChild,
      actualRecord[key],
      path ? `${path}.${key}` : key,
      goldQuery,
      actualQuery,
      report
    );
  }
}

/**
 * Each gold item is paired with the unused actual item that satisfies the most
 * of its leaves, so a layer with most columns right earns partial credit
 * instead of failing wholesale. Unpaired gold items report every leaf.
 */
function matchObjectArray(
  gold: unknown[],
  actual: unknown,
  path: string,
  goldQuery: string,
  actualQuery: string,
  report: MatchReport
): void {
  const candidates = Array.isArray(actual) ? actual : [];
  const used = new Set<number>();

  gold.forEach((goldItem, goldIndex) => {
    const itemPath = `${path}[${goldIndex}]`;
    let best: { index: number; report: MatchReport } | undefined;

    candidates.forEach((candidate, candidateIndex) => {
      if (used.has(candidateIndex) || (best && best.report.mismatches.length === 0)) {
        return;
      }
      const candidateReport = createReport();
      matchValue(goldItem, candidate, itemPath, goldQuery, actualQuery, candidateReport);
      if (!best || candidateReport.mismatches.length < best.report.mismatches.length) {
        best = { index: candidateIndex, report: candidateReport };
      }
    });

    if (best) {
      used.add(best.index);
      mergeReports(report, best.report);
      return;
    }

    const missing = createReport();
    matchValue(goldItem, undefined, itemPath, goldQuery, actualQuery, missing);
    mergeReports(report, missing);
  });
}

function isPrimitiveLeaf(value: unknown): value is number | boolean | null {
  return value === null || typeof value === 'number' || typeof value === 'boolean';
}

function readColumn(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.column === 'string' && value.column.trim().length > 0) {
    return value.column;
  }
  if (typeof value.field === 'string' && value.field.trim().length > 0) {
    return unescapeVegaField(value.field);
  }
  return undefined;
}
