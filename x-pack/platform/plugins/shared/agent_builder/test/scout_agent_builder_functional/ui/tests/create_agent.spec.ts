/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { deleteAgentViaKbn } from '../../../scout_agent_builder_shared/lib/agents_kbn';
import {
  createGenAiConnectorForProxy,
  deleteAllConnectors,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { test, testData } from '../fixtures';

test.describe(
  'Agent Builder — create agent',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let llmProxy: LlmProxy;
    let createdAgentId: string | undefined;

    test.beforeAll(async ({ log, kbnClient }) => {
      llmProxy = await createLlmProxy(log);
      await deleteAllConnectors(kbnClient);
      await createGenAiConnectorForProxy(kbnClient, llmProxy);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient, esClient }) => {
      llmProxy.close();
      await deleteAllConnectors(kbnClient);
      if (createdAgentId) {
        try {
          await deleteAgentViaKbn(kbnClient, createdAgentId);
        } catch {
          // ignore
        }
      }
      await esClient.deleteByQuery({
        index: testData.CHAT_CONVERSATIONS_INDEX,
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
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
