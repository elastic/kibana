/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTING_V2_SECTION_ID = 'alertingV2';
export const ALERTING_V2_RULES_APP_ID = 'rules';
export const ALERTING_V2_ACTION_POLICIES_APP_ID = 'action_policies';
export const ALERTING_V2_EPISODES_APP_ID = 'episodes';

export const ALERTING_V2_RULES_BASE_PATH = `/app/management/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_RULES_APP_ID}`;
export const ALERTING_V2_ACTION_POLICIES_BASE_PATH = `/app/management/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_ACTION_POLICIES_APP_ID}`;
export const ALERTING_V2_EPISODES_BASE_PATH = `/app/management/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EPISODES_APP_ID}`;

export const ALERTING_V2_RULES_MANAGEMENT_PATH = `${ALERTING_V2_SECTION_ID}/${ALERTING_V2_RULES_APP_ID}`;
export const ALERTING_V2_ACTION_POLICIES_MANAGEMENT_PATH = `${ALERTING_V2_SECTION_ID}/${ALERTING_V2_ACTION_POLICIES_APP_ID}`;
export const ALERTING_V2_EPISODES_MANAGEMENT_PATH = `${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EPISODES_APP_ID}`;

export const MANAGEMENT_APP_ID = 'management';
export {
  ALERTING_V2_RULE_API_PATH,
  ALERTING_V2_ACTION_POLICY_API_PATH,
} from '@kbn/alerting-v2-constants';

export const paths = {
  ruleCreate: `${ALERTING_V2_RULES_BASE_PATH}/create`,
  ruleEdit: (id: string) => `${ALERTING_V2_RULES_BASE_PATH}/edit/${encodeURIComponent(id)}`,
  ruleDetails: (id: string) => `${ALERTING_V2_RULES_BASE_PATH}/${encodeURIComponent(id)}`,
  ruleList: ALERTING_V2_RULES_BASE_PATH,
  actionPolicyCreate: `${ALERTING_V2_ACTION_POLICIES_BASE_PATH}/create`,
  actionPolicyEdit: (id: string) =>
    `${ALERTING_V2_ACTION_POLICIES_BASE_PATH}/edit/${encodeURIComponent(id)}`,
  actionPolicyList: ALERTING_V2_ACTION_POLICIES_BASE_PATH,
  alertEpisodesList: ALERTING_V2_EPISODES_BASE_PATH,
  alertEpisodeDetails: (episodeId: string) =>
    `${ALERTING_V2_EPISODES_BASE_PATH}/${encodeURIComponent(episodeId)}`,
};
