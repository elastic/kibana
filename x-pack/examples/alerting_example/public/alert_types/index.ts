/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SanitizedRule } from '@kbn/alerting-plugin/common';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import { registerNavigation as registerPeopleInSpaceNavigation } from './astros';
import { ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

export function registerNavigation(alerting: AlertingSetup) {
  // register default navigation
  alerting.registerDefaultNavigation(
    ALERTING_EXAMPLE_APP_ID,
    (rule: SanitizedRule) => `/rule/${rule.id}`
  );

  registerPeopleInSpaceNavigation(alerting);
}
