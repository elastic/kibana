/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { trackUiMetric } from '../../../../../../src/legacy/core_plugins/ui_metric/public';

/**
 * Note: The UI Metric plugin will take care of sending this data to the telemetry server.
 * You can find these metrics stored at:
 * stack_stats.kibana.plugins.ui_metric.{app}.{metric}(__delayed_{n}ms)?
 * which will be an array of objects each containing a key, representing the metric, and
 * a value, which will be a counter
 */

type ObservabilityApp = 'infra_metrics' | 'infra_logs' | 'apm' | 'uptime';

interface TrackOptions {
  app: ObservabilityApp;
  delay?: number; // in ms
}

type EffectDeps = unknown[];

type TrackMetricOptions = TrackOptions & { metric: string };

export function useTrackMetric(
  { app, metric, delay = 0 }: TrackMetricOptions,
  effectDependencies: EffectDeps = []
) {
  useEffect(() => {
    let decoratedMetric = metric;
    if (delay > 0) {
      decoratedMetric += `__delayed_${delay}ms`;
    }
    const id = setTimeout(() => trackUiMetric(app, decoratedMetric), Math.max(delay, 0));
    return () => clearTimeout(id);
  }, effectDependencies);
}

/**
 * useTrackPageview is a convenience wrapper for tracking a pageview
 * Its metrics will be found at:
 * stack_stats.kibana.plugins.ui_metric.{app}.pageview__{path}(__delayed_{n}ms)?
 */
type TrackPageviewProps = TrackOptions & { path: string };

export function useTrackPageview(
  { path, ...rest }: TrackPageviewProps,
  effectDependencies: EffectDeps = []
) {
  useTrackMetric({ ...rest, metric: `pageview__${path}` }, effectDependencies);
}
