/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/alerting-v2-constants';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../../../common/constants';

const SKILLS_API = '/api/agent_builder/skills';
const RULE_MANAGEMENT_SKILL_ID = 'rule-management';
const ACTION_POLICY_MANAGEMENT_SKILL_ID = 'action-policy-management';
const ALERTING_V2_SKILL_IDS = [RULE_MANAGEMENT_SKILL_ID, ACTION_POLICY_MANAGEMENT_SKILL_ID];

const getSkillIds = (results: Array<{ id: string }>) => results.map((skill) => skill.id);

/*
 * Alerting v2's Agent Builder skills (`rule-management` and
 * `action-policy-management`) are registered unconditionally whenever the
 * Alerting v2 plugin loads. They require both the Agent Builder and the
 * space-scoped Alerting v2 experimental-features advanced settings.
 */
apiTest.describe('Agent Builder — alerting v2 skill gating', () => {
  apiTest.beforeEach(async ({ kbnClient }) => {
    await Promise.all([
      kbnClient.uiSettings.unset(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID),
      kbnClient.uiSettings.unset(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID),
    ]);
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    await Promise.all([
      kbnClient.uiSettings.unset(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID),
      kbnClient.uiSettings.unset(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID),
    ]);
  });

  apiTest(
    'does not list the alerting v2 skills when experimental features are off',
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
    'lists the alerting v2 skills once experimental features are enabled',
    { tag: tags.deploymentAgnostic },
    async ({ apiClient, kbnClient, requestAuth }) => {
      await kbnClient.uiSettings.update({
        [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
        [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
      });

      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const response = await apiClient.get(SKILLS_API, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body.results)).toBe(true);
      for (const skillId of ALERTING_V2_SKILL_IDS) {
        expect(getSkillIds(response.body.results)).toContain(skillId);
      }
    }
  );
});
