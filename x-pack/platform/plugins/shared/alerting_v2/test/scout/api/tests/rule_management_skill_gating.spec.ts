/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { COMMON_HEADERS } from '../fixtures/constants';

const SKILLS_API = '/api/agent_builder/skills';
const GLOBAL_SETTINGS_API = '/api/kibana/global_settings';
const ALERTING_V2_ENABLED_SETTING = 'alerting:v2:enabled';
const RULE_MANAGEMENT_SKILL_ID = 'rule-management';

const getSkillIds = (results: Array<{ id: string }>) => results.map((skill) => skill.id);

// The alerting V2 `rule-management` skill is a built-in Agent Builder skill that
// is gated behind BOTH the agent builder experimental-features advanced setting
// AND the `alerting:v2:enabled` advanced setting. Both must be enabled for the
// skill to be listed, so this suite exercises each gate independently as well as
// the combined case.
//
// This is the canonical gating suite because the generic Scout config leaves
// `alerting:v2:enabled` unpinned, so it can be flipped on and off at runtime.
// The dedicated `scout_alerting_v2` config forces the feature on and therefore
// cannot cover the disabled cases.
apiTest.describe('Agent Builder — alerting V2 rule-management skill gating', () => {
  // Reset both gates after every test. `.unset()` / DELETE are safe no-ops when
  // no user value is set, so we can reset unconditionally — this also guards
  // against a partial write where an update reaches the server but a later
  // assertion throws.
  apiTest.afterEach(async ({ apiClient, kbnClient, requestAuth }) => {
    await kbnClient.uiSettings.unset(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    await apiClient.delete(
      `${GLOBAL_SETTINGS_API}/${encodeURIComponent(ALERTING_V2_ENABLED_SETTING)}`,
      { headers: { ...COMMON_HEADERS, ...apiKeyHeader }, responseType: 'json' }
    );
  });

  apiTest(
    'does not list the rule-management skill when neither gate is enabled',
    { tag: tags.deploymentAgnostic },
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

      const response = await apiClient.get(SKILLS_API, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body.results)).toBe(true);
      // Anchor against a positive signal so a regressed/empty skills endpoint
      // can't make this negative assertion pass vacuously.
      expect(response.body.results.length).toBeGreaterThan(0);
      expect(getSkillIds(response.body.results)).not.toContain(RULE_MANAGEMENT_SKILL_ID);
    }
  );

  apiTest(
    'does not list the rule-management skill when only experimental features are enabled',
    { tag: tags.deploymentAgnostic },
    async ({ apiClient, kbnClient, requestAuth }) => {
      await kbnClient.uiSettings.update({
        [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
      });

      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const response = await apiClient.get(SKILLS_API, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);
      expect(getSkillIds(response.body.results)).not.toContain(RULE_MANAGEMENT_SKILL_ID);
    }
  );

  // Toggling `alerting:v2:enabled` on requires the Alerting V2 plugin, which only
  // ships enabled on stateful; on serverless the plugin is disabled.
  apiTest(
    'does not list the rule-management skill when only alerting:v2:enabled is on',
    { tag: tags.stateful.classic },
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const headers = { ...COMMON_HEADERS, ...apiKeyHeader };

      const setResponse = await apiClient.post(
        `${GLOBAL_SETTINGS_API}/${ALERTING_V2_ENABLED_SETTING}`,
        { headers, body: { value: true }, responseType: 'json' }
      );
      expect(setResponse).toHaveStatusCode(200);

      const response = await apiClient.get(SKILLS_API, { headers, responseType: 'json' });
      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);
      expect(getSkillIds(response.body.results)).not.toContain(RULE_MANAGEMENT_SKILL_ID);
    }
  );

  apiTest(
    'lists the rule-management skill once both gates are enabled',
    { tag: tags.stateful.classic },
    async ({ apiClient, kbnClient, requestAuth }) => {
      await kbnClient.uiSettings.update({
        [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
      });

      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const headers = { ...COMMON_HEADERS, ...apiKeyHeader };

      const setResponse = await apiClient.post(
        `${GLOBAL_SETTINGS_API}/${ALERTING_V2_ENABLED_SETTING}`,
        { headers, body: { value: true }, responseType: 'json' }
      );
      expect(setResponse).toHaveStatusCode(200);

      const response = await apiClient.get(SKILLS_API, { headers, responseType: 'json' });
      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(getSkillIds(response.body.results)).toContain(RULE_MANAGEMENT_SKILL_ID);
    }
  );
});
