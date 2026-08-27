/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — concurrent conversation writes API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let llmProxy: LlmProxy;
    let connectorId: string;
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ log, kbnClient }) => {
      llmProxy = await createLlmProxy(log);
      const { id } = await createGenAiConnectorForProxy(kbnClient, llmProxy);
      connectorId = id;
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      for (const id of conversationIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}`);
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });
  }
);
