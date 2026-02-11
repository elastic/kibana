/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';

const SKILLS_API_BASE = 'api/agent_builder/skills';
const BUILTIN_SKILL_ID = 'data-exploration';

const COMMON_HEADERS: Record<string, string> = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2023-10-31',
};

apiTest.describe('Agent Builder Skills Validation API', { tag: ['@ess'] }, () => {
  const createdSkillIds: string[] = [];
  let adminCredentials: RoleApiCredentials;
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    defaultHeaders = {
      ...adminCredentials.apiKeyHeader,
      ...COMMON_HEADERS,
    };
  });

  apiTest.afterEach(async ({ apiClient }) => {
    for (const skillId of createdSkillIds) {
      try {
        await apiClient.delete(`${SKILLS_API_BASE}/${skillId}`, {
          headers: defaultHeaders,
          responseType: 'json',
        });
      } catch {
        // Skill may already be deleted
      }
    }
    createdSkillIds.length = 0;
  });

  apiTest('should reject creating a skill with an invalid ID', async ({ apiClient }) => {
    const response = await apiClient.post(SKILLS_API_BASE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        id: 'Invalid ID With Spaces',
        name: 'invalid-skill',
        description: 'This should fail',
        content: 'Content.',
        tool_ids: [],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  apiTest('should reject deleting a built-in skill', async ({ apiClient }) => {
    const response = await apiClient.delete(`${SKILLS_API_BASE}/${BUILTIN_SKILL_ID}`, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).not.toBe(200);
  });

  apiTest('should reject updating a built-in skill', async ({ apiClient }) => {
    const response = await apiClient.put(`${SKILLS_API_BASE}/${BUILTIN_SKILL_ID}`, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        name: 'hacked-name',
        description: 'Attempted modification',
        content: 'Should not work.',
        tool_ids: [],
      },
    });

    expect(response.statusCode).not.toBe(200);
  });

  apiTest('should reject deleting a non-existent skill', async ({ apiClient }) => {
    const response = await apiClient.delete(`${SKILLS_API_BASE}/non-existent-skill-id`, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(400);
  });

  apiTest('should reject updating a non-existent skill', async ({ apiClient }) => {
    const response = await apiClient.put(`${SKILLS_API_BASE}/non-existent-skill-id`, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        name: 'attempted-update',
        description: 'Should fail',
        content: 'Should not work.',
        tool_ids: [],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  apiTest('should reject creating a skill with duplicate ID', async ({ apiClient }) => {
    const skillId = `test-skill-dup-${Date.now()}`;
    createdSkillIds.push(skillId);

    // Create the first skill
    await apiClient.post(SKILLS_API_BASE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        id: skillId,
        name: `first-skill-${Date.now()}`,
        description: 'First skill',
        content: 'First content.',
        tool_ids: [],
      },
    });

    // Try to create a second skill with the same ID
    const response = await apiClient.post(SKILLS_API_BASE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        id: skillId,
        name: `second-skill-${Date.now()}`,
        description: 'Second skill with duplicate ID',
        content: 'Second content.',
        tool_ids: [],
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
