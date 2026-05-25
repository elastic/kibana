/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { deleteAgentViaKbn } from '../../../scout_agent_builder_shared/lib/agents_kbn';
import { deleteAllConversationsFromEs } from '../../../scout_agent_builder_shared/lib/conversations_es';
import { test } from '../fixtures';

test.describe(
  'Agent Builder — create agent',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let createdAgentId: string | undefined;

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, esClient }) => {
      if (createdAgentId) {
        try {
          await deleteAgentViaKbn(kbnClient, createdAgentId);
        } catch {
          // ignore
        }
      }
      await deleteAllConversationsFromEs(esClient);
    });

    test('creates an agent', async ({ pageObjects }) => {
      const salt = Date.now();
      const id = `test_agent_${salt}`;
      const name = `Test Agent ${salt}`;
      const labels = ['one', 'two', 'three'];
      createdAgentId = id;
      await pageObjects.agentBuilder.createAgentViaUI({ id, name, labels });
      await pageObjects.agentBuilder.agentExistsOrFail(id);
      expect(await pageObjects.agentBuilder.getAgentLabels(id)).toStrictEqual(labels);
    });
  }
);
