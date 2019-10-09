/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { npSetup, npStart } from 'ui/new_platform';
import { METRIC_TYPE } from '@kbn/analytics';
export { METRIC_TYPE };

/**
 * Note: The UI Metric plugin will take care of sending this data to the telemetry server.
 * You can find these metrics stored at:
 * stack_stats.kibana.plugins.ui_metric.{app}.{metric}(__delayed_{n}ms)?
 * which will be an array of objects each containing a key, representing the metric, and
 * a value, which will be a counter
 */

type ObservabilityApp = 'infra_metrics' | 'infra_logs' | 'apm' | 'uptime';

npSetup.plugins.metrics.registerApp('infra_metrics');
npSetup.plugins.metrics.registerApp('infra_logs');
npSetup.plugins.metrics.registerApp('apm');
npSetup.plugins.metrics.registerApp('uptime');

interface TrackOptions {
  app: ObservabilityApp;
  metricType?: METRIC_TYPE;
  delay?: number; // in ms
}
type EffectDeps = unknown[];

type TrackMetricOptions = TrackOptions & { metric: string };

export function useTrackMetric(
  { app, metric, metricType = METRIC_TYPE.COUNT, delay = 0 }: TrackMetricOptions,
  effectDependencies: EffectDeps = []
) {
  useEffect(() => {
    let decoratedMetric = metric;
    if (delay > 0) {
      decoratedMetric += `__delayed_${delay}ms`;
    }
    const trackUiMetric = npStart.plugins.metrics.reportUiStats.bind(null, app);
    const id = setTimeout(() => trackUiMetric(metricType, decoratedMetric), Math.max(delay, 0));
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

interface TrackEventProps {
  app: ObservabilityApp;
  name: string;
  metricType?: METRIC_TYPE;
}

export function trackEvent({ app, name, metricType = METRIC_TYPE.CLICK }: TrackEventProps) {
  const trackUiMetric = npStart.plugins.metrics.reportUiStats.bind(null, app);
  trackUiMetric(metricType, `event__${name}`);
}
