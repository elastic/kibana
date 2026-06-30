/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { AGENT_BUILDER_UIAM_OAUTH_CLIENT_MANAGEMENT_SETTING_ID } from '@kbn/management-settings-ids';

export const useUiamOAuthClientManagement = (): boolean => {
  return useUiSetting<boolean>(AGENT_BUILDER_UIAM_OAUTH_CLIENT_MANAGEMENT_SETTING_ID);
};
