/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsConfigurationUtilities } from './actions_config';

const MOCK_KIBANA_CONFIG_UTILS: ActionsConfigurationUtilities = {
  isWhitelistedHostname: _ => true,
  isWhitelistedUri: _ => true,
  isActionTypeEnabled: _ => true,
  ensureWhitelistedHostname: _ => {},
  ensureWhitelistedUri: _ => {},
  ensureActionTypeEnabled: _ => {},
};

export function getMockActionConfig(): ActionsConfigurationUtilities {
  return MOCK_KIBANA_CONFIG_UTILS;
}
