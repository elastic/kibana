/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AGENTBUILDER_FEATURE_ID = 'agentBuilder';
export const AGENTBUILDER_FEATURE_NAME = 'Agent Builder';
export const AGENTBUILDER_APP_ID = 'agent_builder';
export const AGENTBUILDER_PATH = '/app/agent_builder';
export const AGENT_BUILDER_FULL_TITLE = i18n.translate('xpack.agentBuilder.app.fullTitle', {
  defaultMessage: 'Agent Builder',
});
export const AGENT_BUILDER_SHORT_TITLE = i18n.translate('xpack.agentBuilder.app.shortTitle', {
  defaultMessage: 'Agents',
});

export const uiPrivileges = {
  show: 'show',
  manageConnectors: 'manageConnectors',
  manageAgents: 'manageAgents',
  manageTools: 'manageTools',
};

export const apiPrivileges = {
  readAgentBuilder: `${AGENTBUILDER_FEATURE_ID}:read`,
  manageUserPrompts: `${AGENTBUILDER_FEATURE_ID}:manageUserPrompts`,
  manageAgents: `${AGENTBUILDER_FEATURE_ID}:manageAgents`,
  manageTools: `${AGENTBUILDER_FEATURE_ID}:manageTools`,
};

export const subFeaturePrivilegeIds = {
  manageAgents: 'manage_agents',
  manageTools: 'manage_tools',
} as const;
