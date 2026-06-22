/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';

/**
 * Returns whether Alerting v2 UI surfaces should be shown based on the
 * `alerting:v2:enabled` advanced setting.
 *
 * The full `CoreStart` is intentionally accepted (rather than a narrower
 * `Pick<CoreStart, 'settings'>`) so that future gating concerns
 * (capability-based RBAC via `core.application.capabilities`, license
 * checks, etc.) can be added inside this helper without changing its
 * signature or touching any of the consumer files again.
 */
export const isAlertingV2Enabled = (core: CoreStart): boolean => {
  return core.settings.globalClient.get<boolean>(ALERTING_V2_ENABLED_SETTING_ID, false) === true;
};
