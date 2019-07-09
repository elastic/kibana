/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { trackUiMetric } from '../../../../../../src/legacy/core_plugins/ui_metric/public';

/**
 * Note: The UI Metric plugin will take care of sending this data to the telemetry server.
 * You can find this data at stack_stats.kibana.plugins.ui_metric.{app} which will be an array
 * of objects containing a key, representing the visit/path, and a value, which will be a counter
 */

type ObservabilityApp = 'infra_metrics' | 'infra_logs' | 'apm' | 'uptime';

interface TrackProps {
  app: ObservabilityApp;
  delay?: number; // in ms
  effectDependencies?: unknown[];
}

type TrackMetricProps = TrackProps & { metric: string };

export function useTrackMetric({
  app,
  metric,
  delay = 0,
  effectDependencies = [],
}: TrackMetricProps) {
  useEffect(() => {
    let decoratedMetric = metric;
    if (delay > 0) {
      decoratedMetric += `__delayed_${delay}ms`;
    }
    const id = setTimeout(() => trackUiMetric(app, decoratedMetric), Math.max(delay, 0));
    return () => clearTimeout(id);
  }, effectDependencies);
}

type TrackPageviewProps = TrackProps & { path: string };

export function useTrackPageview({ path, ...rest }: TrackPageviewProps) {
  useTrackMetric({ ...rest, metric: `pageview__${path}` });
}
