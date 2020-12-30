/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerNavigation as registerPeopleInSpaceNavigation } from './astros';
import { ALERTING_EXAMPLE_APP_ID } from '../../common/constants';
import { SanitizedAlert } from '../../../../plugins/alerts/common';
import { PluginSetupContract as AlertingSetup } from '../../../../plugins/alerts/public';

export function registerNavigation(alerts: AlertingSetup) {
  // register default navigation
  alerts.registerDefaultNavigation(
    ALERTING_EXAMPLE_APP_ID,
    (alert: SanitizedAlert) => `/alert/${alert.id}`
  );

  registerPeopleInSpaceNavigation(alerts);
}
