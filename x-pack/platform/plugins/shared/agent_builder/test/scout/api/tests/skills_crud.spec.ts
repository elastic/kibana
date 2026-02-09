/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { apiTest } from '../fixtures';

const SKILLS_API_BASE = '/api/agent_builder/skills';
const API_VERSION_HEADER = { 'elastic-api-version': '2023-10-31' };
const BUILTIN_SKILL_ID = 'data-exploration';

const skillRequest = (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>
) => ({
  method,
  path,
  body,
  headers: API_VERSION_HEADER,
});

apiTest.describe('Agent Builder Skills CRUD API', { tag: ['@ess'] }, () => {
  const createdSkillIds: string[] = [];

  apiTest.afterEach(async ({ kbnClient }) => {
    for (const skillId of createdSkillIds) {
      try {
        await kbnClient.request(skillRequest('DELETE', `${SKILLS_API_BASE}/${skillId}`));
      } catch {
        // Skill may already be deleted
      }
    }
    createdSkillIds.length = 0;
  });

  apiTest('should list skills including the built-in data-exploration skill', async ({ kbnClient }) => {
    const response = await kbnClient.request(skillRequest('GET', SKILLS_API_BASE));

    const body = response.data as { results: Array<{ id: string; readonly: boolean; description: string }> };
    expect(body).toHaveProperty('results');
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeGreaterThanOrEqual(1);

    // The built-in data-exploration skill should always be present
    const builtinSkill = body.results.find((skill) => skill.id === BUILTIN_SKILL_ID);
    expect(builtinSkill).toBeDefined();
    expect(builtinSkill!.readonly).toBe(true);
  });

  apiTest('should create a new user-created skill', async ({ kbnClient }) => {
    const skillId = `test-skill-create-${Date.now()}`;
    createdSkillIds.push(skillId);

    const response = await kbnClient.request(
      skillRequest('POST', SKILLS_API_BASE, {
        id: skillId,
        name: `test-skill-create-${Date.now()}`,
        description: 'A skill for e2e testing',
        content: 'This is the skill content with instructions.',
        tool_ids: [],
      })
    );

    const body = response.data as {
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

  apiTest('should retrieve a created skill by ID', async ({ kbnClient }) => {
    const skillId = `test-skill-get-${Date.now()}`;
    createdSkillIds.push(skillId);

    await kbnClient.request(
      skillRequest('POST', SKILLS_API_BASE, {
        id: skillId,
        name: `retrievable-skill-${Date.now()}`,
        description: 'Should be retrievable by ID',
        content: 'Skill content here.',
        tool_ids: [],
      })
    );

    const response = await kbnClient.request(
      skillRequest('GET', `${SKILLS_API_BASE}/${skillId}`)
    );

    const body = response.data as { id: string; name: string; readonly: boolean };
    expect(body).toHaveProperty('id', skillId);
    expect(body).toHaveProperty('readonly', false);
  });

  apiTest('should update an existing skill', async ({ kbnClient }) => {
    const skillId = `test-skill-update-${Date.now()}`;
    createdSkillIds.push(skillId);

    await kbnClient.request(
      skillRequest('POST', SKILLS_API_BASE, {
        id: skillId,
        name: `original-name-${Date.now()}`,
        description: 'Original description',
        content: 'Original content.',
        tool_ids: [],
      })
    );

    const updatedName = `updated-name-${Date.now()}`;
    const response = await kbnClient.request(
      skillRequest('PUT', `${SKILLS_API_BASE}/${skillId}`, {
        name: updatedName,
        description: 'Updated description',
        content: 'Updated content.',
        tool_ids: [],
      })
    );

    const body = response.data as {
      name: string;
      description: string;
      content: string;
    };
    expect(body).toHaveProperty('name', updatedName);
    expect(body).toHaveProperty('description', 'Updated description');
    expect(body).toHaveProperty('content', 'Updated content.');
  });

  apiTest('should delete a user-created skill', async ({ kbnClient }) => {
    const skillId = `test-skill-delete-${Date.now()}`;

    await kbnClient.request(
      skillRequest('POST', SKILLS_API_BASE, {
        id: skillId,
        name: `deletable-skill-${Date.now()}`,
        description: 'This skill will be deleted',
        content: 'Content to delete.',
        tool_ids: [],
      })
    );

    const response = await kbnClient.request(
      skillRequest('DELETE', `${SKILLS_API_BASE}/${skillId}`)
    );

    const body = response.data as { success: boolean };
    expect(body).toHaveProperty('success', true);

    // Verify it's gone - should throw a 404
    let getError: Error | undefined;
    try {
      await kbnClient.request(skillRequest('GET', `${SKILLS_API_BASE}/${skillId}`));
    } catch (err) {
      getError = err as Error;
    }

    expect(getError).toBeDefined();
  });

  apiTest('should include user-created skills in list response', async ({ kbnClient }) => {
    const skillId = `test-skill-list-${Date.now()}`;
    createdSkillIds.push(skillId);

    await kbnClient.request(
      skillRequest('POST', SKILLS_API_BASE, {
        id: skillId,
        name: `listed-skill-${Date.now()}`,
        description: 'This skill should appear in list',
        content: 'Listed skill content.',
        tool_ids: [],
      })
    );

    const response = await kbnClient.request(skillRequest('GET', SKILLS_API_BASE));

    const body = response.data as {
      results: Array<{ id: string; readonly: boolean }>;
    };
    const found = body.results.find((skill) => skill.id === skillId);
    expect(found).toBeDefined();
    expect(found!.readonly).toBe(false);
  });

  apiTest('should reject creating a skill with an invalid ID', async ({ kbnClient }) => {
    let createError: Error | undefined;
    try {
      await kbnClient.request({
        ...skillRequest('POST', SKILLS_API_BASE, {
          id: 'Invalid ID With Spaces',
          name: 'invalid-skill',
          description: 'This should fail',
          content: 'Content.',
          tool_ids: [],
        }),
        retries: 0,
      });
    } catch (err) {
      createError = err as Error;
    }

    expect(createError).toBeDefined();
  });

  apiTest('should retrieve the built-in skill by ID', async ({ kbnClient }) => {
    const response = await kbnClient.request(
      skillRequest('GET', `${SKILLS_API_BASE}/${BUILTIN_SKILL_ID}`)
    );

    const body = response.data as { id: string; name: string; description: string; content: string };
    expect(body).toHaveProperty('id', BUILTIN_SKILL_ID);
    expect(body).toHaveProperty('name', 'data-exploration');
    expect(body.description).toBeTruthy();
    expect(body.content).toBeTruthy();
  });

  apiTest('should reject deleting a built-in skill', async ({ kbnClient }) => {
    let deleteError: Error | undefined;
    try {
      await kbnClient.request({
        ...skillRequest('DELETE', `${SKILLS_API_BASE}/${BUILTIN_SKILL_ID}`),
        retries: 0,
      });
    } catch (err) {
      deleteError = err as Error;
    }

    expect(deleteError).toBeDefined();
  });

  apiTest('should reject updating a built-in skill', async ({ kbnClient }) => {
    let updateError: Error | undefined;
    try {
      await kbnClient.request({
        ...skillRequest('PUT', `${SKILLS_API_BASE}/${BUILTIN_SKILL_ID}`, {
          name: 'hacked-name',
          description: 'Attempted modification',
          content: 'Should not work.',
          tool_ids: [],
        }),
        retries: 0,
      });
    } catch (err) {
      updateError = err as Error;
    }

    expect(updateError).toBeDefined();
  });

  apiTest('should reject deleting a non-existent skill', async ({ kbnClient }) => {
    let deleteError: Error | undefined;
    try {
      await kbnClient.request({
        ...skillRequest('DELETE', `${SKILLS_API_BASE}/non-existent-skill-id`),
        retries: 0,
      });
    } catch (err) {
      deleteError = err as Error;
    }

    expect(deleteError).toBeDefined();
  });

  apiTest('should reject updating a non-existent skill', async ({ kbnClient }) => {
    let updateError: Error | undefined;
    try {
      await kbnClient.request({
        ...skillRequest('PUT', `${SKILLS_API_BASE}/non-existent-skill-id`, {
          name: 'attempted-update',
          description: 'Should fail',
          content: 'Should not work.',
          tool_ids: [],
        }),
        retries: 0,
      });
    } catch (err) {
      updateError = err as Error;
    }

    expect(updateError).toBeDefined();
  });

  apiTest('should reject creating a skill with duplicate ID', async ({ kbnClient }) => {
    const skillId = `test-skill-dup-${Date.now()}`;
    createdSkillIds.push(skillId);

    // Create the first skill
    await kbnClient.request(
      skillRequest('POST', SKILLS_API_BASE, {
        id: skillId,
        name: `first-skill-${Date.now()}`,
        description: 'First skill',
        content: 'First content.',
        tool_ids: [],
      })
    );

    // Try to create a second skill with the same ID
    let duplicateError: Error | undefined;
    try {
      await kbnClient.request({
        ...skillRequest('POST', SKILLS_API_BASE, {
          id: skillId,
          name: `second-skill-${Date.now()}`,
          description: 'Second skill with duplicate ID',
          content: 'Second content.',
          tool_ids: [],
        }),
        retries: 0,
      });
    } catch (err) {
      duplicateError = err as Error;
    }

    expect(duplicateError).toBeDefined();
  });
});
