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
  'Agent Builder — skills CRUD API (stateful)',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminCredentials: RoleApiCredentials;
    const createdSkillIds: string[] = [];
    const BUILTIN_SKILL_ID = 'data-exploration';
    const mockSkill = {
      id: 'test-skill',
      name: 'test-skill',
      description: 'A test skill for e2e testing',
      content: 'This is the skill content with instructions.',
      tool_ids: [] as string[],
    };

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

    apiTest('GET lists built-in data-exploration skill', async ({ apiClient }) => {
      const response = await apiClient.get(`${API_AGENT_BUILDER}/skills`, {
        headers: h(),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const builtinSkill = response.body.results.find(
        (skill: { id: string }) => skill.id === BUILTIN_SKILL_ID
      );
      expect(builtinSkill).toBeDefined();
      expect(builtinSkill.readonly).toBe(true);
    });

    apiTest('GET list includes user-created skills', async ({ apiClient }) => {
      const testSkill = { ...mockSkill, id: 'list-test-skill', name: 'list-test-skill' };
      await apiClient.post(`${API_AGENT_BUILDER}/skills`, {
        headers: h(),
        body: testSkill,
        responseType: 'json',
      });
      createdSkillIds.push(testSkill.id);

      const response = await apiClient.get(`${API_AGENT_BUILDER}/skills`, {
        headers: h(),
        responseType: 'json',
      });
      const found = response.body.results.find(
        (skill: { id: string }) => skill.id === testSkill.id
      );
      expect(found).toBeDefined();
      expect(found.readonly).toBe(false);
    });

    apiTest('POST creates skill', async ({ apiClient }) => {
      const testSkill = { ...mockSkill, id: 'create-test-skill', name: 'create-test-skill' };
      const response = await apiClient.post(`${API_AGENT_BUILDER}/skills`, {
        headers: h(),
        body: testSkill,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        id: testSkill.id,
        description: testSkill.description,
        content: testSkill.content,
        readonly: false,
      });
      createdSkillIds.push(testSkill.id);
    });

    apiTest('GET retrieves user skill and built-in skill', async ({ apiClient }) => {
      await apiClient.post(`${API_AGENT_BUILDER}/skills`, {
        headers: h(),
        body: { ...mockSkill, id: 'get-test-skill', name: 'get-test-skill' },
        responseType: 'json',
      });
      createdSkillIds.push('get-test-skill');

      const userSkill = await apiClient.get(`${API_AGENT_BUILDER}/skills/get-test-skill`, {
        headers: h(),
        responseType: 'json',
      });
      expect(userSkill).toHaveStatusCode(200);
      expect(userSkill.body.id).toBe('get-test-skill');

      const builtin = await apiClient.get(
        `${API_AGENT_BUILDER}/skills/${encodeURIComponent(BUILTIN_SKILL_ID)}`,
        { headers: h(), responseType: 'json' }
      );
      expect(builtin).toHaveStatusCode(200);
      expect(builtin.body.id).toBe(BUILTIN_SKILL_ID);
    });

    apiTest('PUT updates skill', async ({ apiClient }) => {
      await apiClient.post(`${API_AGENT_BUILDER}/skills`, {
        headers: h(),
        body: { ...mockSkill, id: 'update-test-skill', name: 'update-test-skill' },
        responseType: 'json',
      });
      createdSkillIds.push('update-test-skill');

      const response = await apiClient.put(`${API_AGENT_BUILDER}/skills/update-test-skill`, {
        headers: h(),
        body: {
          name: 'updated-name',
          description: 'Updated description',
          content: 'Updated content.',
          tool_ids: [],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('updated-name');
      expect(response.body.description).toBe('Updated description');
      expect(response.body.content).toBe('Updated content.');
    });

    apiTest('DELETE removes user skill', async ({ apiClient }) => {
      await apiClient.post(`${API_AGENT_BUILDER}/skills`, {
        headers: h(),
        body: { ...mockSkill, id: 'delete-test-skill', name: 'delete-test-skill' },
        responseType: 'json',
      });
      const del = await apiClient.delete(`${API_AGENT_BUILDER}/skills/delete-test-skill`, {
        headers: h(),
        responseType: 'json',
      });
      expect(del).toHaveStatusCode(200);
      expect(del.body.success).toBe(true);
      const get404 = await apiClient.get(`${API_AGENT_BUILDER}/skills/delete-test-skill`, {
        headers: h(),
        responseType: 'json',
      });
      expect(get404).toHaveStatusCode(404);
    });
  }
);
