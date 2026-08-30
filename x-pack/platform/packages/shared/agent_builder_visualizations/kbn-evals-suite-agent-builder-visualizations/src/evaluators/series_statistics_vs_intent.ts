/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import { statisticsSchema, type XYLegendStatistic } from '@kbn/lens-embeddable-utils';
import type { z } from '@kbn/zod';
import type { ExtractedVisualization } from '../extract_visualization';

export const SERIES_STATISTICS_VS_INTENT_EVALUATOR_NAME = 'Series Statistics vs Intent';

type ZodLiteralUnion = z.ZodUnion<
  readonly [z.ZodLiteral<XYLegendStatistic>, ...Array<z.ZodLiteral<XYLegendStatistic>>]
>;

export const XY_LEGEND_STATISTIC_OPTIONS: XYLegendStatistic[] = (
  statisticsSchema as ZodLiteralUnion
).options.map((option) => option.value);

/**
 * ES|QL aggregations that would wrongly compute a legend statistic as a query
 * column. `count` is empty because COUNT(*) is the typical series measure.
 * Presentation-only stats (difference, first/last without an ES|QL twin) are empty.
 */
const LEGEND_STAT_TO_ESQL_FNS = {
  min: ['MIN'],
  max: ['MAX'],
  avg: ['AVG'],
  median: ['MEDIAN', 'PERCENTILE'],
  range: ['MIN', 'MAX'],
  last_value: ['LAST'],
  last_non_null_value: ['LAST'],
  first_value: ['FIRST'],
  first_non_null_value: ['FIRST'],
  difference: [],
  difference_percentage: [],
  count: [],
  total: ['SUM'],
  standard_deviation: ['STD_DEV'],
  variance: ['VARIANCE'],
  distinct_count: ['COUNT_DISTINCT'],
  current_and_last_value: ['LAST'],
} as const satisfies Record<XYLegendStatistic, readonly string[]>;

const ESQL_STAT_FN_PATTERN = new RegExp(
  `\\b(${[...new Set(Object.values(LEGEND_STAT_TO_ESQL_FNS).flat())].join('|')})\\s*\\(`,
  'gi'
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLegendStatistic = (value: string): value is XYLegendStatistic =>
  (XY_LEGEND_STATISTIC_OPTIONS as string[]).includes(value);

const normalizeLegendStatistics = (values: string[] | undefined): XYLegendStatistic[] =>
  (values ?? []).map((value) => value.trim().toLowerCase()).filter(isLegendStatistic);

const uniqueUpper = (values: string[]): string[] => [
  ...new Set(values.map((value) => value.toUpperCase())),
];

const extractEsqlStatFunctions = (esql: string): string[] => {
  const found = new Set<string>();
  for (const match of esql.matchAll(ESQL_STAT_FN_PATTERN)) {
    found.add(match[1].toUpperCase());
  }
  return [...found];
};

const extractLegendStatistics = (
  visualization: ExtractedVisualization['visualization']
): XYLegendStatistic[] => {
  if (!isRecord(visualization) || !isRecord(visualization.legend)) {
    return [];
  }
  const { statistics } = visualization.legend;
  if (!Array.isArray(statistics)) {
    return [];
  }
  return statistics
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim().toLowerCase())
    .filter(isLegendStatistic);
};

const esqlFunctionsForLegendStats = (legendStatistics: XYLegendStatistic[]): string[] =>
  uniqueUpper(legendStatistics.flatMap((stat) => [...LEGEND_STAT_TO_ESQL_FNS[stat]]));

/**
 * CODE evaluator for series statistics vs a field measure:
 * - Legend statistics belong on `legend.statistics` (any XY option) and must
 *   not be computed as extra ES|QL aggregation columns.
 * - Measure over time: the query must use the named aggregation (e.g. AVG).
 * Skips when the example declares neither expectation.
 */
export function createSeriesStatisticsVsIntentEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  visualizationExtractor: (output: TTaskOutput) => ExtractedVisualization[];
  expectedLegendStatisticsExtractor: (expected: TExample['output']) => string[] | undefined;
  expectedEsqlAggregationsExtractor: (expected: TExample['output']) => string[] | undefined;
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const {
    visualizationExtractor,
    expectedLegendStatisticsExtractor,
    expectedEsqlAggregationsExtractor,
    name = SERIES_STATISTICS_VS_INTENT_EVALUATOR_NAME,
  } = config;

  return {
    name,
    kind: 'CODE',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      const rawLegendStatistics = (expectedLegendStatisticsExtractor(expected) ?? []).map((value) =>
        value.trim().toLowerCase()
      );
      const unknownLegendStatistics = rawLegendStatistics.filter(
        (value) => !isLegendStatistic(value)
      );
      const expectedLegendStatistics = normalizeLegendStatistics(rawLegendStatistics);
      const expectedEsqlAggregations = uniqueUpper(
        expectedEsqlAggregationsExtractor(expected) ?? []
      );

      if (unknownLegendStatistics.length > 0) {
        return {
          score: 0,
          label: 'error',
          explanation: `Unknown legend.statistics option(s): ${unknownLegendStatistics.join(
            ', '
          )}. Valid options: ${XY_LEGEND_STATISTIC_OPTIONS.join(', ')}.`,
          metadata: {
            unknownLegendStatistics,
            validLegendStatistics: XY_LEGEND_STATISTIC_OPTIONS,
          },
        };
      }

      if (expectedLegendStatistics.length === 0 && expectedEsqlAggregations.length === 0) {
        return {
          score: 1,
          label: 'skipped',
          explanation: 'No series-statistics expectation declared for this example.',
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
          explanation: 'No visualization produced to compare series statistics against intent.',
          metadata: { expectedLegendStatistics, expectedEsqlAggregations },
        };
      }

      const forbiddenEsqlFns = esqlFunctionsForLegendStats(expectedLegendStatistics);

      const details = visualizations.map((visualization, index) => {
        const actualEsqlFns = extractEsqlStatFunctions(visualization.esql);
        const actualLegendStatistics = extractLegendStatistics(visualization.visualization);
        const leakedEsqlFns = forbiddenEsqlFns.filter((fn) => actualEsqlFns.includes(fn));
        const missingLegendStatistics = expectedLegendStatistics.filter(
          (stat) => !actualLegendStatistics.includes(stat)
        );
        const missingEsqlAggregations = expectedEsqlAggregations.filter(
          (fn) => !actualEsqlFns.includes(fn)
        );

        const matched =
          leakedEsqlFns.length === 0 &&
          missingLegendStatistics.length === 0 &&
          missingEsqlAggregations.length === 0;

        return {
          index,
          matched,
          actualEsqlFns,
          actualLegendStatistics,
          leakedEsqlFns,
          missingLegendStatistics,
          missingEsqlAggregations,
        };
      });

      const matchedCount = details.filter((detail) => detail.matched).length;
      const score = matchedCount / details.length;
      const firstFailure = details.find((detail) => !detail.matched);
      const failureReasons: string[] = [];
      if (firstFailure?.leakedEsqlFns.length) {
        failureReasons.push(
          `ES|QL included ${firstFailure.leakedEsqlFns.join(
            '/'
          )} — those belong on legend.statistics`
        );
      }
      if (firstFailure?.missingLegendStatistics.length) {
        failureReasons.push(
          `config is missing legend.statistics (${firstFailure.missingLegendStatistics.join(', ')})`
        );
      }
      if (firstFailure?.missingEsqlAggregations.length) {
        failureReasons.push(
          `ES|QL is missing ${firstFailure.missingEsqlAggregations.join(
            '/'
          )} for a measure-over-time request`
        );
      }

      return {
        score,
        label: score === 1 ? 'match' : score === 0 ? 'mismatch' : 'partial',
        explanation:
          score === 1
            ? `All ${details.length} visualization(s) placed series statistics as expected.`
            : failureReasons.join('; ') ||
              `${matchedCount}/${details.length} visualization(s) matched series-statistics intent.`,
        metadata: {
          expectedLegendStatistics,
          expectedEsqlAggregations,
          validLegendStatistics: XY_LEGEND_STATISTIC_OPTIONS,
          matchedCount,
          totalVisualizations: details.length,
          visualizations: details,
        },
      };
    },
  };
}
