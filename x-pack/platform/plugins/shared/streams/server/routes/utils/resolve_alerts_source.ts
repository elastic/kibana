/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_ALERTING_V2 } from '@kbn/management-settings-ids';
import {
  type AlertsSource,
  V1_ALERTS_SOURCE,
  V2_ALERTS_SOURCE,
} from '../../lib/sig_events/read_significant_events_from_alerts_indices';

export async function resolveAlertsSource(
  uiSettingsClient: IUiSettingsClient
): Promise<AlertsSource> {
  const alertingV2Enabled = await uiSettingsClient
    .get(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_ALERTING_V2)
    .then((v) => v ?? false)
    .catch(() => false);

  return alertingV2Enabled ? V2_ALERTS_SOURCE : V1_ALERTS_SOURCE;
}
