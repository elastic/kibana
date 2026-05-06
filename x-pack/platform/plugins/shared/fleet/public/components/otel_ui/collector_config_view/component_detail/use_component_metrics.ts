/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { lastValueFrom } from 'rxjs';

import { useStartServices } from '../../../../hooks';
import type { OTelComponentType } from '../graph_view/constants';
import { useCollectorMetrics } from '../collector_metrics_context';

interface MetricSeries {
  label: string;
  data: Array<{ x: number; y: number }>;
}

export interface MetricGroup {
  id: string;
  series: MetricSeries[];
}

interface UseComponentMetricsResult {
  groups: MetricGroup[];
  isLoading: boolean;
  error?: Error;
}

const METRICS_INDEX = 'metrics-*';

interface MetricDefinition {
  field: string;
  label: string;
  aggType?: 'counter' | 'gauge';
}

interface MetricGroupDefinition {
  id: string;
  metrics: MetricDefinition[];
}

interface ComponentMetricsConfig {
  filterField: string;
  metricGroups: MetricGroupDefinition[];
}

const COMPONENT_METRICS: Partial<Record<OTelComponentType, ComponentMetricsConfig>> = {
  exporter: {
    filterField: 'exporter',
    metricGroups: [
      {
        id: 'throughput',
        metrics: [
          { field: 'otelcol_exporter_sent_metric_points', label: 'Sent metric points/s' },
          { field: 'otelcol_exporter_sent_spans', label: 'Sent spans/s' },
          { field: 'otelcol_exporter_sent_log_records', label: 'Sent log records/s' },
        ],
      },
      {
        id: 'errors',
        metrics: [
          {
            field: 'otelcol_exporter_send_failed_metric_points',
            label: 'Failed metric points/s',
          },
          { field: 'otelcol_exporter_send_failed_spans', label: 'Failed spans/s' },
          { field: 'otelcol_exporter_send_failed_log_records', label: 'Failed log records/s' },
        ],
      },
      {
        id: 'queue',
        metrics: [
          { field: 'otelcol_exporter_queue_size', label: 'Queue size', aggType: 'gauge' },
          { field: 'otelcol_exporter_queue_capacity', label: 'Queue capacity', aggType: 'gauge' },
        ],
      },
    ],
  },
  receiver: {
    filterField: 'receiver',
    metricGroups: [
      {
        id: 'throughput',
        metrics: [
          {
            field: 'otelcol_receiver_accepted_metric_points',
            label: 'Accepted metric points/s',
          },
          { field: 'otelcol_receiver_accepted_spans', label: 'Accepted spans/s' },
          { field: 'otelcol_receiver_accepted_log_records', label: 'Accepted log records/s' },
        ],
      },
    ],
  },
  processor: {
    filterField: 'processor',
    metricGroups: [
      {
        id: 'throughput',
        metrics: [
          {
            field: 'otelcol_processor_incoming_items',
            label: 'Incoming items/s',
          },
          { field: 'otelcol_processor_outgoing_items', label: 'Outgoing items/s' },
        ],
      },
    ],
  },
};

interface ThroughputAggregations {
  throughput: {
    buckets: Array<{
      key: number;
      [metricKey: string]: { value: number | null } | number;
    }>;
  };
}

const buildComponentQuery = (
  serviceInstanceId: string,
  componentId: string,
  componentType: OTelComponentType,
  now: number,
  timeRangeMs: number,
  fixedInterval: string
) => {
  const config = COMPONENT_METRICS[componentType];
  if (!config) {
    return undefined;
  }

  const gte = now - timeRangeMs;
  const subAggs: Record<string, unknown> = {};
  for (const group of config.metricGroups) {
    for (const { field, aggType } of group.metrics) {
      subAggs[`${field}_max`] = { max: { field } };
      if (aggType !== 'gauge') {
        subAggs[`${field}_rate`] = {
          derivative: { gap_policy: 'skip', buckets_path: `${field}_max`, unit: '1s' },
        };
      }
    }
  }

  return {
    params: {
      index: METRICS_INDEX,
      track_total_hits: false,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { 'service.instance.id': serviceInstanceId } },
              { term: { [config.filterField]: componentId } },
              { range: { '@timestamp': { gte, lte: now } } },
            ],
          },
        },
        aggs: {
          throughput: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: fixedInterval,
            },
            aggs: subAggs,
          },
        },
      },
    },
  };
};

function readNormalizedValue(agg?: { value: number | null } | { normalized_value: number | null }) {
  if (!agg) {
    return 0;
  }
  const val = ('normalized_value' in agg ? agg.normalized_value : agg.value) ?? 0;

  return Math.max(0, parseFloat(val.toFixed(2))); // clamp and round to 2 decimals
}

const mapBucketsToSeries = (
  buckets: ThroughputAggregations['throughput']['buckets'],
  metrics: MetricDefinition[]
): MetricSeries[] => {
  return metrics
    .map(({ field, label, aggType }) => ({
      label,
      data: buckets.map((bucket) => {
        const aggKey = aggType === 'gauge' ? `${field}_max` : `${field}_rate`;
        const agg = bucket[aggKey] as { value: number | null } | undefined;
        return {
          x: bucket.key,
          y: readNormalizedValue(agg),
        };
      }),
    }))
    .filter((s) => s.data.length > 0);
};

export const useComponentMetrics = ({
  componentId,
  componentType,
  timeRangeMs,
  fixedInterval,
}: {
  componentId: string;
  componentType: OTelComponentType;
  timeRangeMs: number;
  fixedInterval: string;
}): UseComponentMetricsResult => {
  const { data } = useStartServices();
  const { serviceInstanceId } = useCollectorMetrics();

  const [groups, setGroups] = useState<MetricGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    const metricsConfig = COMPONENT_METRICS[componentType];
    if (!metricsConfig || !serviceInstanceId) {
      setGroups([]);
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsLoading(true);
    setError(undefined);

    const fetchMetrics = async () => {
      try {
        const now = Date.now();
        const searchRequest = buildComponentQuery(
          serviceInstanceId,
          componentId,
          componentType,
          now,
          timeRangeMs,
          fixedInterval
        );

        if (!searchRequest) {
          setIsLoading(false);
          return;
        }

        const {
          rawResponse: { aggregations },
        } = await lastValueFrom(
          data.search.search<
            IKibanaSearchRequest,
            IKibanaSearchResponse<{ aggregations?: ThroughputAggregations }>
          >(searchRequest, { abortSignal: abortController.signal })
        );

        if (!abortController.signal.aborted) {
          const buckets = aggregations?.throughput?.buckets ?? [];
          const metricGroups = metricsConfig.metricGroups.map((group) => ({
            id: group.id,
            series: mapBucketsToSeries(buckets, group.metrics),
          }));

          setGroups(metricGroups);

          setIsLoading(false);
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setIsLoading(false);
        }
      }
    };

    fetchMetrics();

    return () => {
      abortController.abort();
    };
  }, [componentId, componentType, serviceInstanceId, data.search, timeRangeMs, fixedInterval]);

  return { groups, isLoading, error };
};
