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

interface TrackVisitProps {
  app: ObservabilityApp;
  path: string;
  delay?: number;
}

export function useTrackVisit({ app, path, delay = 0 }: TrackVisitProps) {
  useEffect(() => {
    const prefix = delay ? `visit_delay_${delay}ms` : 'visit';
    const id = setTimeout(() => trackUiMetric(app, `${prefix}__${path}`), delay);
    return () => clearTimeout(id);
  }, []);
}
