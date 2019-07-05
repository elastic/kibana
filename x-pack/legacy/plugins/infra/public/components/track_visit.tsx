/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { trackUiMetric } from '../../../../../../src/legacy/core_plugins/ui_metric/public';

interface Props {
  app: 'infra_metrics' | 'infra_logs'; // eventually can be apm | infra | uptime | logs?
  path: string;
  delay?: number;
}

export function useTrackVisit({ app, path, delay = 0 }: Props) {
  useEffect(() => {
    const prefix = delay ? `visit_delay_${delay}ms` : 'visit';
    const id = setTimeout(() => trackUiMetric(app, `${prefix}__${path}`), delay);
    return () => clearTimeout(id);
  }, []);
}

export function TrackVisit(props: Props) {
  useTrackVisit(props);

  return null;
}
