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
const RULE_AUTHORING_SKILL_ID = 'rule-authoring';
const ACTION_POLICY_AUTHORING_SKILL_ID = 'action-policy-authoring';
const ALERTING_V2_SKILL_IDS = [RULE_AUTHORING_SKILL_ID, ACTION_POLICY_AUTHORING_SKILL_ID];
// Several times the 10s uiSettings cache TTL, which a write only invalidates on the node serving it.
const SETTINGS_PROPAGATION_TIMEOUT = 30_000;
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
 * Alerting V2 Agent Builder skills (`rule-authoring` and
 * `action-policy-authoring`) are gated on `alerting:v2:enabled` and on
 * Observability or Classic spaces. They are listed even when
 * `agentBuilder:experimentalFeatures` and `alerting:v2:experimentalFeatures`
 * are off.
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

  // Stateful only (local + ECH): two cases below provision Security/Search/Observability
  // solution-view spaces, which a single-solution serverless project cannot host.
  // alerting_v2 is enabled on serverless oblt, so the plugin is not the constraint.
  apiTest(
    'does not list the alerting V2 skills when alerting:v2:enabled is off',
    { tag: tags.stateful.all },
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

      // Poll so the `alerting:v2:enabled` write can refresh on every node before the
      // negative assertion; a stale node would still list the skills from its cached
      // setting (the ECH multi-node uiSettings cache is only eventually consistent).
      await expect
        .poll(
          async () => {
            const response = await apiClient.get(SKILLS_API, { headers, responseType: 'json' });
            // Returned, not thrown: throwing inside expect.poll aborts polling instead of retrying.
            if (response.statusCode !== 200) {
              return `status ${response.statusCode}: ${JSON.stringify(response.body)}`;
            }
            // Guard against a false pass before the skills list is populated.
            if (response.body.results.length === 0) {
              return 'no skills returned yet';
            }
            const skillIds = getSkillIds(response.body.results);
            return ALERTING_V2_SKILL_IDS.every((skillId) => !skillIds.includes(skillId));
          },
          { timeout: SETTINGS_PROPAGATION_TIMEOUT, intervals: [1_000] }
        )
        .toBe(true);
    }
  );

  apiTest(
    'lists both Alerting V2 skills when alerting:v2:enabled is on and experimental features are off',
    { tag: tags.stateful.all },
    async ({ apiClient, kbnClient, requestAuth }) => {
      await kbnClient.uiSettings.update({
        [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: false,
        [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: false,
      });

      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const headers = { ...COMMON_HEADERS, ...apiKeyHeader };

      const setResponse = await apiClient.post(
        `${GLOBAL_SETTINGS_API}/${ALERTING_V2_ENABLED_SETTING}`,
        { headers, body: { value: true }, responseType: 'json' }
      );
      expect(setResponse).toHaveStatusCode(200);

      await expect
        .poll(
          async () => {
            const response = await apiClient.get(SKILLS_API, { headers, responseType: 'json' });
            // Returned, not thrown: throwing inside expect.poll aborts polling instead of retrying.
            if (response.statusCode !== 200) {
              return `status ${response.statusCode}: ${JSON.stringify(response.body)}`;
            }
            return getSkillIds(response.body.results);
          },
          { timeout: SETTINGS_PROPAGATION_TIMEOUT, intervals: [1_000] }
        )
        .toStrictEqual(expect.arrayContaining(ALERTING_V2_SKILL_IDS));
    }
  );

  apiTest(
    'does not list Alerting V2 skills in Security or Search solution spaces',
    { tag: tags.stateful.all },
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
              [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: false,
              [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: false,
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
          // Poll so the solution-view and enabled writes can refresh on every node
          // before the negative assertion; a stale node would still list the skills.
          await expect
            .poll(
              async () => {
                const response = await apiClient.get(`/s/${id}${SKILLS_API}`, {
                  headers,
                  responseType: 'json',
                });
                // Returned, not thrown: throwing inside expect.poll aborts polling instead of retrying.
                if (response.statusCode !== 200) {
                  return `status ${response.statusCode}: ${JSON.stringify(response.body)}`;
                }
                // Guard against a false pass before the space's skills are populated.
                if (response.body.results.length === 0) {
                  return 'no skills returned yet';
                }
                const skillIds = getSkillIds(response.body.results);
                return ALERTING_V2_SKILL_IDS.every((skillId) => !skillIds.includes(skillId));
              },
              { timeout: SETTINGS_PROPAGATION_TIMEOUT, intervals: [1_000] }
            )
            .toBe(true);
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
    { tag: tags.stateful.all },
    async ({ apiClient, apiServices, kbnClient, requestAuth }) => {
      const { id, solution } = OBSERVABILITY_SOLUTION_SPACE;
      await apiServices.spaces.delete(id);
      await apiServices.spaces.create({ id });

      try {
        await apiServices.spaces.setSolutionView({ id, solution });
        await kbnClient.uiSettings.update(
          {
            [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: false,
            [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: false,
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
