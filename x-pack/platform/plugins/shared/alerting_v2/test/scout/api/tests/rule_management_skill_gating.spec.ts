/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/alerting-v2-constants';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { COMMON_HEADERS } from '../fixtures/constants';

const SKILLS_API = '/api/agent_builder/skills';
const GLOBAL_SETTINGS_API = '/api/kibana/global_settings';
const ALERTING_V2_ENABLED_SETTING = 'alerting:v2:enabled';
const RULE_MANAGEMENT_SKILL_ID = 'rule-management';
const ACTION_POLICY_MANAGEMENT_SKILL_ID = 'action-policy-management';
const ALERTING_V2_SKILL_IDS = [RULE_MANAGEMENT_SKILL_ID, ACTION_POLICY_MANAGEMENT_SKILL_ID];
const RESTRICTED_SOLUTION_SPACES = [
  { id: 'alerting-v2-security-solution', solution: 'security' as const },
  { id: 'alerting-v2-search-solution', solution: 'es' as const },
];
const OBSERVABILITY_SOLUTION_SPACE = {
  id: 'alerting-v2-observability-solution',
  solution: 'oblt' as const,
};

const getSkillIds = (results: Array<{ id: string }>) => results.map((skill) => skill.id);

/*
 * Alerting V2 Agent Builder skills (`rule-management` and
 * `action-policy-management`) are gated behind the Agent Builder
 * experimental-features advanced setting and `alerting:v2:enabled`. Both
 * skills also share one additional, space-scoped gate:
 * `alerting:v2:experimentalFeatures`. This suite exercises all gates before
 * asserting either skill is listed.
 *
 * This is the canonical gating suite because the generic Scout config does not
 * pin `alerting:v2:enabled` (it defaults to on), so it can be flipped at runtime.
 * The dedicated `scout_alerting_v2` config forces the feature on and therefore
 * cannot cover the disabled cases.
 */
apiTest.describe('Agent Builder — alerting V2 skill gating', () => {
  // Reset all gates after every test. `.unset()` / DELETE are safe no-ops when
  // no user value is set, so we can reset unconditionally — this also guards
  // against a partial write where an update reaches the server but a later
  // assertion throws.
  apiTest.afterEach(async ({ apiClient, kbnClient, requestAuth }) => {
    await kbnClient.uiSettings.unset(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
    await kbnClient.uiSettings.unset(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID);
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    await apiClient.delete(
      `${GLOBAL_SETTINGS_API}/${encodeURIComponent(ALERTING_V2_ENABLED_SETTING)}`,
      { headers: { ...COMMON_HEADERS, ...apiKeyHeader }, responseType: 'json' }
    );
  });

  apiTest(
    'does not list the alerting V2 skills when neither gate is enabled',
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
      for (const skillId of ALERTING_V2_SKILL_IDS) {
        expect(getSkillIds(response.body.results)).not.toContain(skillId);
      }
    }
  );

  apiTest(
    'does not list the alerting V2 skills when only experimental features are enabled',
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
      for (const skillId of ALERTING_V2_SKILL_IDS) {
        expect(getSkillIds(response.body.results)).not.toContain(skillId);
      }
    }
  );

  // Toggling `alerting:v2:enabled` requires the Alerting V2 plugin, which only
  // ships enabled on stateful; on serverless the plugin is disabled.
  // Constantly fails on ECH: https://github.com/elastic/kibana/issues/283926
  apiTest(
    'does not list the alerting V2 skills when alerting:v2:enabled is off',
    { tag: '@local-stateful-classic' },
    async ({ apiClient, kbnClient, requestAuth }) => {
      await kbnClient.uiSettings.update({
        [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
        [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
      });

      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const headers = { ...COMMON_HEADERS, ...apiKeyHeader };

      const setResponse = await apiClient.post(
        `${GLOBAL_SETTINGS_API}/${ALERTING_V2_ENABLED_SETTING}`,
        { headers, body: { value: false }, responseType: 'json' }
      );
      expect(setResponse).toHaveStatusCode(200);

      const response = await apiClient.get(SKILLS_API, { headers, responseType: 'json' });
      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);
      for (const skillId of ALERTING_V2_SKILL_IDS) {
        expect(getSkillIds(response.body.results)).not.toContain(skillId);
      }
    }
  );

  apiTest(
    'does not list either Alerting V2 skill when its experimental gate is disabled',
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

      const skillIds = getSkillIds(response.body.results);
      expect(skillIds).not.toContain(RULE_MANAGEMENT_SKILL_ID);
      expect(skillIds).not.toContain(ACTION_POLICY_MANAGEMENT_SKILL_ID);
    }
  );

  apiTest(
    'lists both Alerting V2 skills when all applicable gates are enabled',
    { tag: tags.stateful.classic },
    async ({ apiClient, kbnClient, requestAuth }) => {
      await kbnClient.uiSettings.update({
        [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
        [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
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
      for (const skillId of ALERTING_V2_SKILL_IDS) {
        expect(getSkillIds(response.body.results)).toContain(skillId);
      }
    }
  );

  apiTest(
    'does not list Alerting V2 skills in Security or Search solution spaces',
    { tag: tags.stateful.classic },
    async ({ apiClient, apiServices, kbnClient, requestAuth }) => {
      for (const { id } of RESTRICTED_SOLUTION_SPACES) {
        await apiServices.spaces.delete(id);
        await apiServices.spaces.create({ id });
      }

      try {
        for (const { id, solution } of RESTRICTED_SOLUTION_SPACES) {
          await apiServices.spaces.setSolutionView({ id, solution });
          await kbnClient.uiSettings.update(
            {
              [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
              [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
            },
            { space: id }
          );
        }

        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
        const headers = { ...COMMON_HEADERS, ...apiKeyHeader };
        const setResponse = await apiClient.post(
          `${GLOBAL_SETTINGS_API}/${ALERTING_V2_ENABLED_SETTING}`,
          { headers, body: { value: true }, responseType: 'json' }
        );
        expect(setResponse).toHaveStatusCode(200);

        for (const { id } of RESTRICTED_SOLUTION_SPACES) {
          const response = await apiClient.get(`/s/${id}${SKILLS_API}`, {
            headers,
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          expect(response.body.results.length).toBeGreaterThan(0);

          const skillIds = getSkillIds(response.body.results);
          for (const skillId of ALERTING_V2_SKILL_IDS) {
            expect(skillIds).not.toContain(skillId);
          }
        }
      } finally {
        for (const { id } of RESTRICTED_SOLUTION_SPACES) {
          await apiServices.spaces.delete(id);
        }
      }
    }
  );

  apiTest(
    'lists Alerting V2 skills in an Observability solution space',
    { tag: tags.stateful.classic },
    async ({ apiClient, apiServices, kbnClient, requestAuth }) => {
      const { id, solution } = OBSERVABILITY_SOLUTION_SPACE;
      await apiServices.spaces.delete(id);
      await apiServices.spaces.create({ id });

      try {
        await apiServices.spaces.setSolutionView({ id, solution });
        await kbnClient.uiSettings.update(
          {
            [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
            [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
          },
          { space: id }
        );

        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
        const headers = { ...COMMON_HEADERS, ...apiKeyHeader };
        const setResponse = await apiClient.post(
          `${GLOBAL_SETTINGS_API}/${ALERTING_V2_ENABLED_SETTING}`,
          { headers, body: { value: true }, responseType: 'json' }
        );
        expect(setResponse).toHaveStatusCode(200);

        const response = await apiClient.get(`/s/${id}${SKILLS_API}`, {
          headers,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        const skillIds = getSkillIds(response.body.results);
        for (const skillId of ALERTING_V2_SKILL_IDS) {
          expect(skillIds).toContain(skillId);
        }
      } finally {
        await apiServices.spaces.delete(id);
      }
    }
  );
});
