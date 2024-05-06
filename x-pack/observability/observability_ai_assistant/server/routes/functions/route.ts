/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import { nonEmptyStringRt, toBooleanRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { ContextDefinition, FunctionDefinition } from '../../../common/functions/types';
import { KnowledgeBaseEntryRole } from '../../../common/types';
import type { RecalledEntry } from '../../service/knowledge_base_service';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';

const getFunctionsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/functions',
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (
    resources
  ): Promise<{
    functionDefinitions: FunctionDefinition[];
    contextDefinitions: ContextDefinition[];
  }> => {
    const { service, request } = resources;

    const controller = new AbortController();
    request.events.aborted$.subscribe(() => {
      controller.abort();
    });

    const client = await service.getClient({ request });

    const functionClient = await service.getFunctionClient({
      signal: controller.signal,
      resources,
      client,
      screenContexts: [],
    });

    return {
      functionDefinitions: functionClient.getFunctions().map((fn) => fn.definition),
      contextDefinitions: functionClient.getContexts(),
    };
  },
});

const functionRecallRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/recall',
  params: t.type({
    body: t.intersection([
      t.type({
        queries: t.array(nonEmptyStringRt),
      }),
      t.partial({
        categories: t.array(t.string),
      }),
    ]),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (
    resources
  ): Promise<{
    entries: RecalledEntry[];
  }> => {
    const client = await resources.service.getClient({ request: resources.request });

    const {
      body: { queries, categories },
    } = resources.params;

    if (!client) {
      throw notImplemented();
    }

    return client.recall({ queries, categories });
  },
});

const functionSummariseRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/summarize',
  params: t.type({
    body: t.type({
      id: t.string,
      text: nonEmptyStringRt,
      confidence: t.union([t.literal('low'), t.literal('medium'), t.literal('high')]),
      is_correction: toBooleanRt,
      public: toBooleanRt,
      labels: t.record(t.string, t.string),
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<void> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    const {
      confidence,
      id,
      is_correction: isCorrection,
      text,
      public: isPublic,
      labels,
    } = resources.params.body;

    return client.createKnowledgeBaseEntry({
      entry: {
        confidence,
        id,
        doc_id: id,
        is_correction: isCorrection,
        text,
        public: isPublic,
        labels,
        role: KnowledgeBaseEntryRole.AssistantSummarization,
      },
    });
  },
});

export const functionRoutes = {
  ...getFunctionsRoute,
  ...functionRecallRoute,
  ...functionSummariseRoute,
};
