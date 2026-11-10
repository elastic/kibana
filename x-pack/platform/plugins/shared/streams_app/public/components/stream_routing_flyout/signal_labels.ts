/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UnitSignal } from '../../services/unit_pipeline';

export const ROUTING_SIGNAL_LABELS: Readonly<Record<UnitSignal, string>> = {
  logs: i18n.translate('xpack.streams.routingFlyout.signal.logs', { defaultMessage: 'Logs' }),
  metrics: i18n.translate('xpack.streams.routingFlyout.signal.metrics', {
    defaultMessage: 'Metrics',
  }),
  traces: i18n.translate('xpack.streams.routingFlyout.signal.traces', {
    defaultMessage: 'Traces',
  }),
  docs: i18n.translate('xpack.streams.routingFlyout.signal.docs', { defaultMessage: 'Docs' }),
  profiles: i18n.translate('xpack.streams.routingFlyout.signal.profiles', {
    defaultMessage: 'Profiles',
  }),
};
