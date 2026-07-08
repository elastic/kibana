/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS } from '../fixtures/constants';

const SKILLS_API = '/api/agent_builder/skills';
const GLOBAL_SETTINGS_API = '/api/kibana/global_settings';
const ALERTING_V2_ENABLED_SETTING = 'alerting:v2:enabled';
const RULE_MANAGEMENT_SKILL_ID = 'rule-management';

const getSkillIds = (results: Array<{ id: string }>) => results.map((skill) => skill.id);

// The alerting V2 `rule-management` skill is registered as a built-in Agent
// Builder skill but gated behind the `alerting:v2:enabled` advanced setting.
apiTest.describe('Agent Builder — alerting V2 rule-management skill gating', () => {
  // Only the stateful "enabled" case flips the global setting; track that so the
  // afterAll reset is skipped on serverless (where the endpoint is unavailable).
  let didEnableAlertingV2 = false;

  apiTest.afterAll(async ({ apiClient, requestAuth }) => {
    if (!didEnableAlertingV2) {
      return;
    }
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    await apiClient.post(`${GLOBAL_SETTINGS_API}/${ALERTING_V2_ENABLED_SETTING}`, {
      headers: { ...COMMON_HEADERS, ...apiKeyHeader },
      body: { value: false },
      responseType: 'json',
    });
  });

  apiTest(
    'does not list the rule-management skill when alerting V2 is disabled',
    { tag: tags.deploymentAgnostic },
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

      const response = await apiClient.get(SKILLS_API, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(getSkillIds(response.body.results)).not.toContain(RULE_MANAGEMENT_SKILL_ID);
    }
  );

  // Stateful only: the Alerting V2 plugin ships enabled on stateful, and the
  // default config leaves `alerting:v2:enabled` unpinned so it can be toggled on
  // at runtime. On serverless the plugin is disabled, so the enabled case cannot
  // be exercised with the generic config.
  apiTest(
    'lists the rule-management skill once alerting:v2:enabled is turned on',
    { tag: tags.stateful.classic },
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const headers = { ...COMMON_HEADERS, ...apiKeyHeader };

      const setResponse = await apiClient.post(
        `${GLOBAL_SETTINGS_API}/${ALERTING_V2_ENABLED_SETTING}`,
        { headers, body: { value: true }, responseType: 'json' }
      );
      didEnableAlertingV2 = true;
      expect(setResponse).toHaveStatusCode(200);

      const response = await apiClient.get(SKILLS_API, { headers, responseType: 'json' });
      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(getSkillIds(response.body.results)).toContain(RULE_MANAGEMENT_SKILL_ID);
    }
  );
});
