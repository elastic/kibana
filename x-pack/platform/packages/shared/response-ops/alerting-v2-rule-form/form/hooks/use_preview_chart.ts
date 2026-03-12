/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@kbn/react-hooks';
import {
  LensConfigBuilder,
  type LensXYConfig,
  type LensSeriesLayer,
  type LensAttributes,
} from '@kbn/lens-embeddable-utils/config_builder';
import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';
import { useRuleFormServices } from '../contexts';
import { parseDuration } from '../utils';

/** Debounce wait time in milliseconds — matches the preview grid debounce */
const DEBOUNCE_WAIT = 2000;

/** Target number of bars for the chart. ES|QL's BUCKET function will pick
 *  a "nice" interval (e.g. 15s, 1m, 5m, 1h, 1d) to approximate this count. */
const TARGET_BUCKETS = 20;

/**
 * Builds an ES|QL chart query from the user's base query + time field.
 *
 * The query uses BUCKET to auto-calculate a bucket interval and STATS COUNT(*)
 * to produce the row count per bucket. The time range is constrained to the
 * lookback window via a WHERE clause.
 */
const buildChartQuery = (baseQuery: string, timeField: string, lookback: string): string | null => {
  if (!baseQuery?.trim() || !timeField?.trim() || !lookback?.trim()) {
    return null;
  }

  // Validate the base query is syntactically correct before augmenting
  if (validateEsqlQuery(baseQuery)) {
    return null;
  }

  let lookbackMs: number;
  try {
    lookbackMs = parseDuration(lookback);
  } catch {
    return null;
  }

  // Compute absolute time bounds so the chart only shows the lookback window
  const now = Date.now();
  const dateEnd = new Date(now).toISOString();
  const dateStart = new Date(now - lookbackMs).toISOString();

  // Build an ES|QL query that:
  // 1. Filters to the lookback window via WHERE
  // 2. Auto-buckets the time field and counts rows per bucket
  return [
    baseQuery,
    `| WHERE ${timeField} >= "${dateStart}" AND ${timeField} <= "${dateEnd}"`,
    `| STATS __count = COUNT(*) BY __bucket = BUCKET(${timeField}, ${TARGET_BUCKETS}, "${dateStart}", "${dateEnd}")`,
    `| SORT __bucket`,
  ].join('\n');
};

const CHART_LAYERS: LensSeriesLayer[] = [
  {
    type: 'series',
    seriesType: 'bar',
    xAxis: {
      type: 'dateHistogram',
      field: '__bucket',
    },
    yAxis: [
      {
        value: '__count',
        label: 'Count',
        format: 'number',
      },
    ],
  },
];

const DEFAULT_LENS_CONFIG: Omit<LensXYConfig, 'title' | 'dataset'> = {
  chartType: 'xy',
  layers: CHART_LAYERS,
  legend: {
    show: false,
  },
  axisTitleVisibility: {
    showXAxisTitle: false,
    showYAxisTitle: false,
    showYRightAxisTitle: false,
  },
  fittingFunction: 'None',
};

export interface UsePreviewChartResult {
  /** Lens attributes needed to render the chart, or undefined while building */
  lensAttributes: LensAttributes | undefined;
  /** Time range for the chart derived from the lookback window */
  timeRange: { from: string; to: string } | undefined;
  /** The ES|QL chart query string */
  chartQuery: string | null;
  /** Whether the chart attributes are currently being built */
  isLoading: boolean;
  /** Whether the chart attributes failed to build */
  hasError: boolean;
}

export interface UsePreviewChartParams {
  /** The base ES|QL query (without condition) */
  query: string;
  /** The time field name for the date histogram */
  timeField: string;
  /** The lookback duration string (e.g. '5m', '1h') */
  lookback: string;
  /** Whether the chart is enabled (defaults to true) */
  enabled?: boolean;
}

/**
 * Hook that builds Lens embeddable attributes for a preview bar chart.
 *
 * The chart shows the count of rows over time (date histogram on the time
 * field) for the configured ES|QL query and lookback window.
 *
 * Uses the same debounce timing as `usePreview` to keep the chart and grid
 * visually in sync.
 */
export const usePreviewChart = ({
  query,
  timeField,
  lookback,
  enabled = true,
}: UsePreviewChartParams): UsePreviewChartResult => {
  const { dataViews } = useRuleFormServices();

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_WAIT);

  const chartQuery = useMemo(
    () => (enabled ? buildChartQuery(debouncedQuery ?? '', timeField, lookback) : null),
    [enabled, debouncedQuery, timeField, lookback]
  );

  const timeRange = useMemo(() => {
    if (!lookback?.trim()) return undefined;
    try {
      const lookbackMs = parseDuration(lookback);
      const now = Date.now();
      return {
        from: new Date(now - lookbackMs).toISOString(),
        to: new Date(now).toISOString(),
      };
    } catch {
      return undefined;
    }
  }, [lookback]);

  const [lensAttributes, setLensAttributes] = useState<LensAttributes | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!chartQuery || !dataViews) {
      setLensAttributes(undefined);
      setHasError(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLensAttributes(undefined);

    const builder = new LensConfigBuilder(dataViews);
    const lensConfig: LensXYConfig = {
      ...DEFAULT_LENS_CONFIG,
      title: 'Rule results preview',
      dataset: {
        esql: chartQuery,
      },
    };

    builder
      .build(lensConfig, {
        query: {
          esql: chartQuery,
        },
      })
      .then((attributes) => {
        if (!cancelled) {
          setLensAttributes(attributes as LensAttributes);
          setHasError(false);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLensAttributes(undefined);
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chartQuery, dataViews]);

  // True while the debounce timer is pending
  const isDebouncing = query !== debouncedQuery;

  return {
    lensAttributes,
    timeRange,
    chartQuery,
    isLoading: isDebouncing || isLoading,
    hasError,
  };
};
