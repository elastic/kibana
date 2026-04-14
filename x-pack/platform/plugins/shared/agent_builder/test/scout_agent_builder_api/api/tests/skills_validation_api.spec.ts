/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — skills validation API (stateful)',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminCredentials: RoleApiCredentials;
    const createdSkillIds: string[] = [];
    const BUILTIN_SKILL_ID = 'data-exploration';

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
    });

    apiTest.afterAll(async ({ apiClient }) => {
      for (const skillId of createdSkillIds) {
        await apiClient.delete(`${API_AGENT_BUILDER}/skills/${encodeURIComponent(skillId)}`, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        });
      }
    });

    const h = () => ({ ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader });

    apiTest('POST rejects invalid skill id', async ({ apiClient }) => {
      const response = await apiClient.post(`${API_AGENT_BUILDER}/skills`, {
        headers: h(),
        body: {
          id: 'Invalid ID With Spaces',
          name: 'invalid-skill',
          description: 'This should fail',
          content: 'Content.',
          tool_ids: [],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body).toHaveProperty('message');
    });

    apiTest('POST rejects duplicate skill id', async ({ apiClient }) => {
      const skillId = 'duplicate-test-skill';
      await apiClient.post(`${API_AGENT_BUILDER}/skills`, {
        headers: h(),
        body: {
          id: skillId,
          name: 'first-skill',
          description: 'First skill',
          content: 'First content.',
          tool_ids: [],
        },
        responseType: 'json',
      });
      createdSkillIds.push(skillId);

      const dup = await apiClient.post(`${API_AGENT_BUILDER}/skills`, {
        headers: h(),
        body: {
          id: skillId,
          name: 'second-skill',
          description: 'Second skill with duplicate ID',
          content: 'Second content.',
          tool_ids: [],
        },
        responseType: 'json',
      });
      expect(dup).toHaveStatusCode(409);
    });

    apiTest('PUT rejects updating built-in skill', async ({ apiClient }) => {
      const response = await apiClient.put(
        `${API_AGENT_BUILDER}/skills/${encodeURIComponent(BUILTIN_SKILL_ID)}`,
        {
          headers: h(),
          body: {
            name: 'hacked-name',
            description: 'Attempted modification',
            content: 'Should not work.',
            tool_ids: [],
          },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(400);
    });

    apiTest('PUT rejects updating missing skill', async ({ apiClient }) => {
      const response = await apiClient.put(`${API_AGENT_BUILDER}/skills/non-existent-skill-id`, {
        headers: h(),
        body: {
          name: 'attempted-update',
          description: 'Should fail',
          content: 'Should not work.',
          tool_ids: [],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('DELETE rejects built-in skill', async ({ apiClient }) => {
      const response = await apiClient.delete(
        `${API_AGENT_BUILDER}/skills/${encodeURIComponent(BUILTIN_SKILL_ID)}`,
        { headers: h(), responseType: 'json' }
      );
      expect(response.statusCode).not.toBe(200);
    });

    apiTest('DELETE rejects missing skill', async ({ apiClient }) => {
      const response = await apiClient.delete(`${API_AGENT_BUILDER}/skills/non-existent-skill-id`, {
        headers: h(),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
    });
  }
);
