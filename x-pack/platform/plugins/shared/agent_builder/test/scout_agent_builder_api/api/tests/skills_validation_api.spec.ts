/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — skills validation API (stateful)',
  { tag: [...tags.stateful.classic] },
  () => {
    const createdSkillIds: string[] = [];
    const BUILTIN_SKILL_ID = 'visualization-creation';

    apiTest.afterAll(async ({ asAdmin }) => {
      for (const skillId of createdSkillIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/skills/${encodeURIComponent(skillId)}`);
      }
    });

    apiTest('POST rejects invalid skill id', async ({ asAdmin }) => {
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/skills`, {
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
      expect(response.body.message).toBeDefined();
    });

    apiTest('POST rejects duplicate skill id', async ({ asAdmin }) => {
      const skillId = 'duplicate-test-skill';
      await asAdmin.post(`${API_AGENT_BUILDER}/skills`, {
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

      const dup = await asAdmin.post(`${API_AGENT_BUILDER}/skills`, {
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

    apiTest('PUT rejects updating built-in skill', async ({ asAdmin }) => {
      const response = await asAdmin.put(
        `${API_AGENT_BUILDER}/skills/${encodeURIComponent(BUILTIN_SKILL_ID)}`,
        {
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

    apiTest('PUT rejects updating missing skill', async ({ asAdmin }) => {
      const response = await asAdmin.put(`${API_AGENT_BUILDER}/skills/non-existent-skill-id`, {
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

    apiTest('DELETE rejects built-in skill', async ({ asAdmin }) => {
      const response = await asAdmin.delete(
        `${API_AGENT_BUILDER}/skills/${encodeURIComponent(BUILTIN_SKILL_ID)}`,
        { responseType: 'json' }
      );
      expect(response.statusCode).not.toBe(200);
    });

    apiTest('DELETE rejects missing skill', async ({ asAdmin }) => {
      const response = await asAdmin.delete(`${API_AGENT_BUILDER}/skills/non-existent-skill-id`, {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
    });
  }
);
