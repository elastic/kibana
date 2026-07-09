/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../../common/constants';

const SKILLS_API = '/api/agent_builder/skills';
const SETTINGS_API = '/internal/kibana/settings';
const EXPERIMENTAL_FEATURES_SETTING = 'agentBuilder:experimentalFeatures';
const RULE_MANAGEMENT_SKILL_ID = 'rule-management';

const getSkillIds = (results: Array<{ id: string }>) => results.map((skill) => skill.id);

apiTest.describe(
  'Agent Builder — alerting V2 rule-management skill experimental gating',
  { tag: tags.deploymentAgnostic },
  () => {
    // Only the "enabled" case flips the setting; track that so the afterAll reset
    // is skipped when it never ran.
    let didEnableExperimentalFeatures = false;

    apiTest.afterAll(async ({ apiClient, requestAuth }) => {
      if (!didEnableExperimentalFeatures) {
        return;
      }
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      await apiClient.post(SETTINGS_API, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        body: { changes: { [EXPERIMENTAL_FEATURES_SETTING]: null } },
        responseType: 'json',
      });
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
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
        const headers = { ...COMMON_HEADERS, ...apiKeyHeader };

        const setResponse = await apiClient.post(SETTINGS_API, {
          headers,
          body: { changes: { [EXPERIMENTAL_FEATURES_SETTING]: true } },
          responseType: 'json',
        });
        didEnableExperimentalFeatures = true;
        expect(setResponse).toHaveStatusCode(200);

        const response = await apiClient.get(SKILLS_API, { headers, responseType: 'json' });
        expect(response).toHaveStatusCode(200);
        expect(Array.isArray(response.body.results)).toBe(true);
        expect(getSkillIds(response.body.results)).toContain(RULE_MANAGEMENT_SKILL_ID);
      }
    );
  }
);
