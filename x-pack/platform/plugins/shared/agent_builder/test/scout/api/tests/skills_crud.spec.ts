/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';

const SKILLS_API_BASE = '/api/agent_builder/skills';
const BUILTIN_SKILL_ID = 'data-exploration';
const EXPERIMENTAL_FEATURES_SETTING = 'agentBuilder:experimentalFeatures';

const COMMON_HEADERS: Record<string, string> = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
  'elastic-api-version': '2023-10-31',
};

apiTest.describe('Agent Builder Skills CRUD API', { tag: ['@ess'] }, () => {
  const createdSkillIds: string[] = [];
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...COMMON_HEADERS,
    };
    // Enable the experimental features flag so skill routes are accessible
    await kbnClient.uiSettings.update({
      [EXPERIMENTAL_FEATURES_SETTING]: true,
    });
  });

  apiTest.afterEach(async ({ apiClient }) => {
    for (const skillId of createdSkillIds) {
      try {
        await apiClient.delete(`${SKILLS_API_BASE}/${skillId}`, { headers: defaultHeaders });
      } catch {
        // Skill may already be deleted
      }
    }
    createdSkillIds.length = 0;
  });

  apiTest(
    'should list skills including the built-in data-exploration skill',
    async ({ apiClient }) => {
      const response = await apiClient.get(SKILLS_API_BASE, { headers: defaultHeaders });

      expect(response.statusCode).toBe(200);
      const body = response.body as {
        results: Array<{ id: string; readonly: boolean; description: string }>;
      };
      expect(body).toHaveProperty('results');
      expect(Array.isArray(body.results)).toBe(true);
      expect(body.results.length).toBeGreaterThanOrEqual(1);

      // The built-in data-exploration skill should always be present
      const builtinSkill = body.results.find((skill) => skill.id === BUILTIN_SKILL_ID);
      expect(builtinSkill).toBeDefined();
      expect(builtinSkill!.readonly).toBe(true);
    }
  );

  apiTest('should create a new user-created skill', async ({ apiClient }) => {
    const skillId = `test-skill-create-${Date.now()}`;
    createdSkillIds.push(skillId);

    const response = await apiClient.post(SKILLS_API_BASE, {
      headers: defaultHeaders,
      body: {
        id: skillId,
        name: `test-skill-create-${Date.now()}`,
        description: 'A skill for e2e testing',
        content: 'This is the skill content with instructions.',
        tool_ids: [],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.body as {
      id: string;
      name: string;
      description: string;
      content: string;
      readonly: boolean;
    };
    expect(body).toHaveProperty('id', skillId);
    expect(body).toHaveProperty('description', 'A skill for e2e testing');
    expect(body).toHaveProperty('content', 'This is the skill content with instructions.');
    expect(body).toHaveProperty('readonly', false);
  });

  apiTest('should retrieve a created skill by ID', async ({ apiClient }) => {
    const skillId = `test-skill-get-${Date.now()}`;
    createdSkillIds.push(skillId);

    await apiClient.post(SKILLS_API_BASE, {
      headers: defaultHeaders,
      body: {
        id: skillId,
        name: `retrievable-skill-${Date.now()}`,
        description: 'Should be retrievable by ID',
        content: 'Skill content here.',
        tool_ids: [],
      },
    });

    const response = await apiClient.get(`${SKILLS_API_BASE}/${skillId}`, {
      headers: defaultHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.body as { id: string; name: string; readonly: boolean };
    expect(body).toHaveProperty('id', skillId);
    expect(body).toHaveProperty('readonly', false);
  });

  apiTest('should update an existing skill', async ({ apiClient }) => {
    const skillId = `test-skill-update-${Date.now()}`;
    createdSkillIds.push(skillId);

    await apiClient.post(SKILLS_API_BASE, {
      headers: defaultHeaders,
      body: {
        id: skillId,
        name: `original-name-${Date.now()}`,
        description: 'Original description',
        content: 'Original content.',
        tool_ids: [],
      },
    });

    const updatedName = `updated-name-${Date.now()}`;
    const response = await apiClient.put(`${SKILLS_API_BASE}/${skillId}`, {
      headers: defaultHeaders,
      body: {
        name: updatedName,
        description: 'Updated description',
        content: 'Updated content.',
        tool_ids: [],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.body as {
      name: string;
      description: string;
      content: string;
    };
    expect(body).toHaveProperty('name', updatedName);
    expect(body).toHaveProperty('description', 'Updated description');
    expect(body).toHaveProperty('content', 'Updated content.');
  });

  apiTest('should delete a user-created skill', async ({ apiClient }) => {
    const skillId = `test-skill-delete-${Date.now()}`;

    await apiClient.post(SKILLS_API_BASE, {
      headers: defaultHeaders,
      body: {
        id: skillId,
        name: `deletable-skill-${Date.now()}`,
        description: 'This skill will be deleted',
        content: 'Content to delete.',
        tool_ids: [],
      },
    });

    const response = await apiClient.delete(`${SKILLS_API_BASE}/${skillId}`, {
      headers: defaultHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.body as { success: boolean };
    expect(body).toHaveProperty('success', true);

    // Verify it's gone - should return 404
    const getResponse = await apiClient.get(`${SKILLS_API_BASE}/${skillId}`, {
      headers: defaultHeaders,
    });
    expect(getResponse.statusCode).toBe(404);
  });

  apiTest('should include user-created skills in list response', async ({ apiClient }) => {
    const skillId = `test-skill-list-${Date.now()}`;
    createdSkillIds.push(skillId);

    await apiClient.post(SKILLS_API_BASE, {
      headers: defaultHeaders,
      body: {
        id: skillId,
        name: `listed-skill-${Date.now()}`,
        description: 'This skill should appear in list',
        content: 'Listed skill content.',
        tool_ids: [],
      },
    });

    const response = await apiClient.get(SKILLS_API_BASE, { headers: defaultHeaders });

    expect(response.statusCode).toBe(200);
    const body = response.body as {
      results: Array<{ id: string; readonly: boolean }>;
    };
    const found = body.results.find((skill) => skill.id === skillId);
    expect(found).toBeDefined();
    expect(found!.readonly).toBe(false);
  });

  apiTest('should reject creating a skill with an invalid ID', async ({ apiClient }) => {
    const response = await apiClient.post(SKILLS_API_BASE, {
      headers: defaultHeaders,
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

  apiTest('should retrieve the built-in skill by ID', async ({ apiClient }) => {
    const response = await apiClient.get(`${SKILLS_API_BASE}/${BUILTIN_SKILL_ID}`, {
      headers: defaultHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.body as {
      id: string;
      name: string;
      description: string;
      content: string;
    };
    expect(body).toHaveProperty('id', BUILTIN_SKILL_ID);
    expect(body).toHaveProperty('name', 'data-exploration');
    expect(body.description).toBeTruthy();
    expect(body.content).toBeTruthy();
  });

  apiTest('should reject deleting a built-in skill', async ({ apiClient }) => {
    const response = await apiClient.delete(`${SKILLS_API_BASE}/${BUILTIN_SKILL_ID}`, {
      headers: defaultHeaders,
    });

    expect(response.statusCode).not.toBe(200);
  });

  apiTest('should reject updating a built-in skill', async ({ apiClient }) => {
    const response = await apiClient.put(`${SKILLS_API_BASE}/${BUILTIN_SKILL_ID}`, {
      headers: defaultHeaders,
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
    });

    expect(response.statusCode).toBe(404);
  });

  apiTest('should reject updating a non-existent skill', async ({ apiClient }) => {
    const response = await apiClient.put(`${SKILLS_API_BASE}/non-existent-skill-id`, {
      headers: defaultHeaders,
      body: {
        name: 'attempted-update',
        description: 'Should fail',
        content: 'Should not work.',
        tool_ids: [],
      },
    });

    expect(response.statusCode).toBe(404);
  });

  apiTest('should reject creating a skill with duplicate ID', async ({ apiClient }) => {
    const skillId = `test-skill-dup-${Date.now()}`;
    createdSkillIds.push(skillId);

    // Create the first skill
    await apiClient.post(SKILLS_API_BASE, {
      headers: defaultHeaders,
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
      body: {
        id: skillId,
        name: `second-skill-${Date.now()}`,
        description: 'Second skill with duplicate ID',
        content: 'Second content.',
        tool_ids: [],
      },
    });

    expect(response.statusCode).toBe(409);
  });
});
