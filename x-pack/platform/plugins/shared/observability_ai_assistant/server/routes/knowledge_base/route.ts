/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  handler: async (
    resources
  ): Promise<{
    errorMessage?: string;
    enabled: boolean;
    endpoint?: Partial<InferenceInferenceEndpointInfo>;
    modelStats?: Partial<MlTrainedModelStats>;
    kbState: KnowledgeBaseState;
    currentInferenceId?: string | undefined;
    concreteWriteIndex: string | undefined;
    isReIndexing: boolean;
  }> => {
    const client = await resources.service.getClient({ request: resources.request });
    return client.getKnowledgeBaseStatus();
  },
});

const setupKnowledgeBase = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
  params: t.type({
    query: t.intersection([
      t.type({ inference_id: t.string }),
      t.partial({ wait_until_complete: toBooleanRt }),
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
    reindex: boolean;
    currentInferenceId: string | undefined;
    nextInferenceId: string;
  }> => {
    const client = await resources.service.getClient({ request: resources.request });
    const { inference_id: inferenceId, wait_until_complete: waitUntilComplete } =
      resources.params.query;
    return client.setupKnowledgeBase(inferenceId, waitUntilComplete);
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
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<{ success: boolean }> => {
    const client = await resources.service.getClient({ request: resources.request });
    await client.reIndexKnowledgeBaseWithLock();
    return { success: true };
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
      text: nonEmptyStringRt,
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
      entry: { id, text, public: isPublic, title: `User instruction` },
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

    const entries = resources.params.body.entries.map((entry) => ({
      public: true,
      labels: {},
      role: KnowledgeBaseEntryRole.UserEntry,
      ...entry,
    }));

    await client.addKnowledgeBaseBulkEntries({ entries });

    resources.logger.info(`Imported ${entries.length} knowledge base entries`);
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
