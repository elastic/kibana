/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerNavigation as registerPeopleInSpaceNavigation } from './astros';
import { ALERTING_EXAMPLE_APP_ID } from '../../common/constants';
import { SanitizedAlert } from '../../../../plugins/alerting/common';
import { PluginSetupContract as AlertingSetup } from '../../../../plugins/alerting/public';

export function registerNavigation(alerting: AlertingSetup) {
  // register default navigation
  alerting.registerDefaultNavigation(
    ALERTING_EXAMPLE_APP_ID,
    (alert: SanitizedAlert) => `/rule/${alert.id}`
  );

  registerPeopleInSpaceNavigation(alerting);
}
