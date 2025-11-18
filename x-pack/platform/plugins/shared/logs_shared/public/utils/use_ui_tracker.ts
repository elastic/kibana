/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { UiCounterMetricType } from '@kbn/analytics';
import { METRIC_TYPE } from '@kbn/analytics';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

/**
 * Note: The usage_collection plugin will take care of sending this data to the telemetry server.
 * You can find the metrics that are collected by these hooks in Stack Telemetry.
 * Search the index `kibana-ui-counter`. You can filter for `eventName` and/or `appName`.
 */

interface TrackOptions {
  metricType?: UiCounterMetricType;
  delay?: number; // in ms
}

interface ServiceDeps {
  usageCollection: UsageCollectionSetup; // TODO: This should really be start. Looking into it.
}

export type TrackMetricOptions = TrackOptions & { metric: string };
export type UiTracker = ReturnType<typeof useUiTracker>;
export type TrackEvent = (options: TrackMetricOptions) => void;

export { METRIC_TYPE };

export function useUiTracker<Services extends ServiceDeps>(): TrackEvent {
  const reportUiCounter = useKibana<Services>().services?.usageCollection?.reportUiCounter;
  const trackEvent = useMemo(() => {
    return ({ metric, metricType = METRIC_TYPE.COUNT }: TrackMetricOptions) => {
      if (reportUiCounter) {
        reportUiCounter('infra_logs', metricType, metric);
      }
    };
  }, [reportUiCounter]);
  return trackEvent;
}
