/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../../common/constants';

const SKILLS_API = '/api/agent_builder/skills';
const RULE_MANAGEMENT_SKILL_ID = 'rule-management';

const getSkillIds = (results: Array<{ id: string }>) => results.map((skill) => skill.id);

apiTest.describe(
  'Agent Builder — alerting V2 rule-management skill experimental gating',
  { tag: tags.deploymentAgnostic },
  () => {
    // `.unset()` is a safe no-op when the setting has no user value, so we can
    // reset unconditionally — this also guards against a partial write where the
    // update reaches the server but a later assertion throws.
    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.unset(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
    });

    apiTest(
      'does not list the rule-management skill when experimental features are disabled',
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

    apiTest(
      'lists the rule-management skill once experimental features are enabled',
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
        expect(getSkillIds(response.body.results)).toContain(RULE_MANAGEMENT_SKILL_ID);
      }
    );
  }
);
