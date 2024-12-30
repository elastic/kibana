/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import { nonEmptyStringRt, toBooleanRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { v4 } from 'uuid';
import { FunctionDefinition } from '../../../common/functions/types';
import { KnowledgeBaseEntryRole } from '../../../common/types';
import type { RecalledEntry } from '../../service/knowledge_base_service';
import { getSystemMessageFromInstructions } from '../../service/util/get_system_message_from_instructions';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { assistantScopeType } from '../runtime_types';

const getFunctionsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/functions',
  params: t.type({
    query: t.partial({
      scopes: t.union([t.array(assistantScopeType), assistantScopeType]),
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (
    resources
  ): Promise<{
    functionDefinitions: FunctionDefinition[];
    systemMessage: string;
  }> => {
    const {
      service,
      request,
      params: {
        query: { scopes: inputScopes },
      },
    } = resources;

    const scopes = inputScopes ? (Array.isArray(inputScopes) ? inputScopes : [inputScopes]) : [];

    const controller = new AbortController();
    request.events.aborted$.subscribe(() => {
      controller.abort();
    });

    const client = await service.getClient({ request });

    const [functionClient, userInstructions] = await Promise.all([
      service.getFunctionClient({
        signal: controller.signal,
        resources,
        client,
        screenContexts: [],
        scopes,
      }),
      // error is caught in client
      client.getKnowledgeBaseUserInstructions(),
    ]);

    const functionDefinitions = functionClient.getFunctions().map((fn) => fn.definition);

    const availableFunctionNames = functionDefinitions.map((def) => def.name);

    return {
      functionDefinitions,
      systemMessage: getSystemMessageFromInstructions({
        applicationInstructions: functionClient.getInstructions(),
        userInstructions,
        adHocInstructions: functionClient.getAdhocInstructions(),
        availableFunctionNames,
      }),
    };
  },
});

const functionRecallRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/recall',
  params: t.type({
    body: t.intersection([
      t.type({
        queries: t.array(
          t.intersection([
            t.type({
              text: t.string,
            }),
            t.partial({
              boost: t.number,
            }),
          ])
        ),
      }),
      t.partial({
        categories: t.array(t.string),
      }),
    ]),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
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

    const entries = await client.recall({ queries, categories });
    return { entries };
  },
});

const functionSummariseRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/functions/summarize',
  params: t.type({
    body: t.type({
      title: t.string,
      text: nonEmptyStringRt,
      confidence: t.union([t.literal('low'), t.literal('medium'), t.literal('high')]),
      is_correction: toBooleanRt,
      public: toBooleanRt,
      labels: t.record(t.string, t.string),
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<void> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    const {
      title,
      confidence,
      is_correction: isCorrection,
      text,
      public: isPublic,
      labels,
    } = resources.params.body;

    return client.addKnowledgeBaseEntry({
      entry: {
        title,
        confidence,
        id: v4(),
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
