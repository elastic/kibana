/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools/handler';
import type { ZodObject } from '@kbn/zod/v4';
import type { z } from '@kbn/zod/v4';
import type { StreamsClient } from '../../lib/streams/client';
import type { QueryClient } from '../../lib/streams/assets/query/query_client';
import type { AttachmentClient } from '../../lib/streams/attachments/attachment_client';
import type { RouteHandlerScopedClients, GetScopedClients } from '../../routes/types';

/**
 * Subset of RouteHandlerScopedClients that tools actually use.
 * Using Pick ensures property names and types stay in sync with the
 * real interface — renames or type changes cause a compile error here.
 */
type ToolScopedClients = Pick<
  RouteHandlerScopedClients,
  'streamsClient' | 'scopedClusterClient' | 'getQueryClient' | 'attachmentClient'
>;

export const createMockGetScopedClients = () => {
  const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  const esClient = scopedClusterClient.asCurrentUser;

  const streamsClient: jest.Mocked<
    Pick<
      StreamsClient,
      | 'getStream'
      | 'listStreamsWithDataStreamExistence'
      | 'getAncestors'
      | 'getDescendants'
      | 'getDataStream'
      | 'upsertStream'
      | 'forkStream'
      | 'deleteStream'
    >
  > = {
    getStream: jest.fn(),
    listStreamsWithDataStreamExistence: jest.fn(),
    getAncestors: jest.fn().mockResolvedValue([]),
    getDescendants: jest.fn().mockResolvedValue([]),
    getDataStream: jest.fn(),
    upsertStream: jest.fn().mockResolvedValue({ acknowledged: true, result: 'updated' }),
    forkStream: jest.fn().mockResolvedValue({ acknowledged: true, result: 'created' }),
    deleteStream: jest.fn().mockResolvedValue({ acknowledged: true, result: 'deleted' }),
  };

  const queryClient: jest.Mocked<Pick<QueryClient, 'getAssets'>> = {
    getAssets: jest.fn().mockResolvedValue([]),
  };

  const getQueryClient = jest.fn().mockResolvedValue(queryClient);

  const attachmentClient: jest.Mocked<Pick<AttachmentClient, 'getAttachments'>> = {
    getAttachments: jest.fn().mockResolvedValue([]),
  };

  // Satisfies ensures property names stay in sync with RouteHandlerScopedClients.
  // If a property is renamed or removed from the interface, this will fail.
  const scopedClients: {
    [K in keyof ToolScopedClients]: unknown;
  } = {
    streamsClient,
    scopedClusterClient,
    getQueryClient,
    attachmentClient,
  };

  const getScopedClients = jest
    .fn()
    .mockResolvedValue(scopedClients) as jest.MockedFunction<GetScopedClients>;

  return {
    getScopedClients,
    streamsClient,
    esClient,
    scopedClusterClient,
    getQueryClient,
    attachmentClient,
  };
};

export const createMockRequest = () => httpServerMock.createKibanaRequest();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const invokeHandler = async <TSchema extends ZodObject<any>>(
  tool: BuiltinToolDefinition<TSchema>,
  input: z.infer<TSchema>,
  context: ToolHandlerContext
) => {
  return tool.handler(input, context);
};

export const createMockToolContext = (): ToolHandlerContext => {
  const inferenceClient = {
    chatComplete: jest.fn(),
    output: jest.fn(),
  };

  return {
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    esClient: elasticsearchServiceMock.createScopedClusterClient(),
    savedObjectsClient: savedObjectsClientMock.create(),
    modelProvider: {
      getDefaultModel: jest.fn().mockResolvedValue({ inferenceClient }),
      getModel: jest.fn(),
      getUsageStats: jest.fn().mockReturnValue({ calls: [] }),
    } as ToolHandlerContext['modelProvider'],
    toolProvider: {
      has: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
    } as ToolHandlerContext['toolProvider'],
    runner: {
      runTool: jest.fn(),
      runInternalTool: jest.fn(),
      runAgent: jest.fn(),
    } as ToolHandlerContext['runner'],
    resultStore: {
      has: jest.fn(),
      get: jest.fn(),
      add: jest.fn(),
      delete: jest.fn(),
      asReadonly: jest.fn(),
    } as ToolHandlerContext['resultStore'],
    events: {
      reportProgress: jest.fn(),
      sendUiEvent: jest.fn(),
    } as ToolHandlerContext['events'],
    logger: loggerMock.create(),
    prompts: {
      checkConfirmationStatus: jest.fn(),
      askForConfirmation: jest.fn(),
    } as ToolHandlerContext['prompts'],
    stateManager: {
      getState: jest.fn(),
      setState: jest.fn(),
    } as ToolHandlerContext['stateManager'],
    attachments: {
      get: jest.fn(),
      getAttachmentRecord: jest.fn(),
      getActive: jest.fn().mockReturnValue([]),
      getAll: jest.fn().mockReturnValue([]),
      getDiff: jest.fn(),
      add: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      permanentDelete: jest.fn(),
      rename: jest.fn(),
      updateOrigin: jest.fn(),
      evaluateStalenessForActiveAttachments: jest.fn().mockResolvedValue([]),
      getAccessedRefs: jest.fn().mockReturnValue([]),
      clearAccessTracking: jest.fn(),
      resolveRefs: jest.fn().mockReturnValue([]),
      getTotalTokenEstimate: jest.fn().mockReturnValue(0),
      hasChanges: jest.fn().mockReturnValue(false),
      markClean: jest.fn(),
    } as ToolHandlerContext['attachments'],
    filestore: {
      read: jest.fn(),
      ls: jest.fn(),
      glob: jest.fn(),
      grep: jest.fn(),
    } as ToolHandlerContext['filestore'],
    skills: {
      list: jest.fn(),
      get: jest.fn(),
      bulkGet: jest.fn(),
      convertSkillTool: jest.fn(),
    } as ToolHandlerContext['skills'],
    toolManager: {
      setEventEmitter: jest.fn(),
      addTools: jest.fn(),
      list: jest.fn(),
      recordToolUse: jest.fn(),
      getToolIdMapping: jest.fn(),
      getToolOrigin: jest.fn(),
      getDynamicToolIds: jest.fn(),
      getSummarizer: jest.fn(),
    } as ToolHandlerContext['toolManager'],
    runContext: {
      runId: 'test-run-id',
      stack: [],
    },
  };
};
