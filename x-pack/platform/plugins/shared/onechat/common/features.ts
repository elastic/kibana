/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ONECHAT_FEATURE_ID = 'agentBuilder';
export const ONECHAT_FEATURE_NAME = 'Agent Builder';
export const ONECHAT_APP_ID = 'agent_builder';
export const ONECHAT_PATH = '/app/agent_builder';
export const AGENT_BUILDER_FULL_TITLE = i18n.translate('xpack.onechat.app.fullTitle', {
  defaultMessage: 'Agent Builder',
});
export const AGENT_BUILDER_SHORT_TITLE = i18n.translate('xpack.onechat.app.shortTitle', {
  defaultMessage: 'Agents',
});

export const uiPrivileges = {
  show: 'show',
  showManagement: 'showManagement',
};

export const apiPrivileges = {
  readOnechat: 'read_onechat',
  manageOnechat: 'manage_onechat',
};
