/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import { nonEmptyStringRt, toBooleanRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import {
  InferenceInferenceEndpointInfo,
  MlTrainedModelStats,
} from '@elastic/elasticsearch/lib/api/types';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import {
  Instruction,
  KnowledgeBaseEntry,
  KnowledgeBaseEntryRole,
  KnowledgeBaseState,
} from '../../../common/types';

const getKnowledgeBaseStatus = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/kb/status',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async ({
    service,
    request,
  }): Promise<{
    errorMessage?: string;
    enabled: boolean;
    endpoint?: Partial<InferenceInferenceEndpointInfo>;
    modelStats?: Partial<MlTrainedModelStats>;
    kbState: KnowledgeBaseState;
  }> => {
    const client = await service.getClient({ request });
    return client.getKnowledgeBaseStatus();
  },
});

const setupKnowledgeBase = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
  params: t.type({
    query: t.type({
      inference_id: t.string,
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
    reindex: boolean;
    currentInferenceId: string | undefined;
    nextInferenceId: string;
  }> => {
    const client = await resources.service.getClient({ request: resources.request });
    const { inference_id: inferenceId } = resources.params.query;
    return client.setupKnowledgeBase(inferenceId);
  },
});

const warmupModelKnowledgeBase = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/kb/warmup_model',
  params: t.type({
    query: t.type({
      inference_id: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<void> => {
    const client = await resources.service.getClient({ request: resources.request });
    const { inference_id: inferenceId } = resources.params.query;
    return client.warmupKbModel(inferenceId);
  },
});

const reIndexKnowledgeBase = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/kb/reindex',
  params: t.type({
    query: t.type({
      inference_id: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<{ result: boolean }> => {
    const client = await resources.service.getClient({ request: resources.request });
    const { inference_id: inferenceId } = resources.params.query;
    const result = await client.reIndexKnowledgeBaseWithLock(inferenceId);
    return { result };
  },
});

const startupMigrationsKnowledgeBase = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/kb/migrations/startup',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<void> => {
    const client = await resources.service.getClient({ request: resources.request });
    return client.runStartupMigrations();
  },
});

const getKnowledgeBaseInferenceEndpoints = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/kb/inference_endpoints',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (
    resources
  ): Promise<{
    endpoints: InferenceAPIConfigResponse[];
  }> => {
    const client = await resources.service.getClient({ request: resources.request });

    return {
      endpoints: await client.getInferenceEndpointsForEmbedding(),
    };
  },
});

const getKnowledgeBaseUserInstructions = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (
    resources
  ): Promise<{
    userInstructions: Array<Instruction & { public?: boolean }>;
  }> => {
    const client = await resources.service.getClient({ request: resources.request });

    return {
      userInstructions: await client.getKnowledgeBaseUserInstructions(),
    };
  },
});

const saveKnowledgeBaseUserInstruction = createObservabilityAIAssistantServerRoute({
  endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
  params: t.type({
    body: t.type({
      id: t.string,
      text: t.string,
      public: toBooleanRt,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<void> => {
    const client = await resources.service.getClient({ request: resources.request });

    const { id, text, public: isPublic } = resources.params.body;
    return client.addUserInstruction({
      entry: { id, text, public: isPublic },
    });
  },
});

const getKnowledgeBaseEntries = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  params: t.type({
    query: t.type({
      query: t.string,
      sortBy: t.string,
      sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
    }),
  }),
  handler: async (
    resources
  ): Promise<{
    entries: KnowledgeBaseEntry[];
  }> => {
    const client = await resources.service.getClient({ request: resources.request });
    const { query, sortBy, sortDirection } = resources.params.query;

    return client.getKnowledgeBaseEntries({ query, sortBy, sortDirection });
  },
});

const knowledgeBaseEntryRt = t.intersection([
  t.type({
    id: t.string,
    title: t.string,
    text: nonEmptyStringRt,
  }),
  t.partial({
    confidence: t.union([t.literal('low'), t.literal('medium'), t.literal('high')]),
    is_correction: toBooleanRt,
    public: toBooleanRt,
    labels: t.record(t.string, t.string),
    role: t.union([
      t.literal(KnowledgeBaseEntryRole.AssistantSummarization),
      t.literal(KnowledgeBaseEntryRole.UserEntry),
      t.literal(KnowledgeBaseEntryRole.Elastic),
    ]),
  }),
]);

const saveKnowledgeBaseEntry = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
  params: t.type({
    body: knowledgeBaseEntryRt,
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<void> => {
    const client = await resources.service.getClient({ request: resources.request });

    const entry = resources.params.body;
    return client.addKnowledgeBaseEntry({
      entry: {
        confidence: 'high',
        is_correction: false,
        public: true,
        labels: {},
        role: KnowledgeBaseEntryRole.UserEntry,
        ...entry,
      },
    });
  },
});

const deleteKnowledgeBaseEntry = createObservabilityAIAssistantServerRoute({
  endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
  params: t.type({
    path: t.type({
      entryId: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<void> => {
    const client = await resources.service.getClient({ request: resources.request });
    return client.deleteKnowledgeBaseEntry(resources.params.path.entryId);
  },
});

const importKnowledgeBaseEntries = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
  params: t.type({
    body: t.type({
      entries: t.array(knowledgeBaseEntryRt),
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<void> => {
    const client = await resources.service.getClient({ request: resources.request });

    const { kbState } = await client.getKnowledgeBaseStatus();

    if (kbState !== KnowledgeBaseState.READY) {
      throw new Error('Knowledge base is not ready');
    }

    const limiter = pLimit(5);

    const promises = resources.params.body.entries.map(async (entry) => {
      return limiter(async () => {
        return client.addKnowledgeBaseEntry({
          entry: {
            confidence: 'high',
            is_correction: false,
            public: true,
            labels: {},
            role: KnowledgeBaseEntryRole.UserEntry,
            ...entry,
          },
        });
      });
    });

    await Promise.all(promises);
  },
});

export const knowledgeBaseRoutes = {
  ...reIndexKnowledgeBase,
  ...startupMigrationsKnowledgeBase,
  ...setupKnowledgeBase,
  ...reIndexKnowledgeBase,
  ...getKnowledgeBaseStatus,
  ...getKnowledgeBaseEntries,
  ...saveKnowledgeBaseUserInstruction,
  ...importKnowledgeBaseEntries,
  ...getKnowledgeBaseUserInstructions,
  ...saveKnowledgeBaseEntry,
  ...deleteKnowledgeBaseEntry,
  ...getKnowledgeBaseInferenceEndpoints,
  ...warmupModelKnowledgeBase,
};
