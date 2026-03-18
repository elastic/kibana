/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools/handler';
import type { ZodObject } from '@kbn/zod/v4';
import type { z } from '@kbn/zod/v4';
import type { StreamsClient } from '../../lib/streams/client';
import type { GetScopedClients } from '../../routes/types';

type MockScopedClusterClient = ReturnType<
  typeof elasticsearchServiceMock.createScopedClusterClient
>;

export const createMockGetScopedClients = () => {
  const scopedClusterClient: MockScopedClusterClient =
    elasticsearchServiceMock.createScopedClusterClient();
  const esClient = scopedClusterClient.asCurrentUser;
  const streamsClient: jest.Mocked<
    Pick<
      StreamsClient,
      | 'getStream'
      | 'listStreamsWithDataStreamExistence'
      | 'getAncestors'
      | 'getDescendants'
      | 'getDataStream'
    >
  > = {
    getStream: jest.fn(),
    listStreamsWithDataStreamExistence: jest.fn(),
    getAncestors: jest.fn().mockResolvedValue([]),
    getDescendants: jest.fn().mockResolvedValue([]),
    getDataStream: jest.fn(),
  };

  const getScopedClients = jest.fn().mockResolvedValue({
    streamsClient,
    scopedClusterClient,
    esClient,
  }) as unknown as GetScopedClients;

  return { getScopedClients, streamsClient, esClient, scopedClusterClient };
};

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
    savedObjectsClient: {} as unknown as ToolHandlerContext['savedObjectsClient'],
    modelProvider: {
      getDefaultModel: jest.fn().mockResolvedValue({ inferenceClient }),
      getModel: jest.fn(),
    } as unknown as ToolHandlerContext['modelProvider'],
    toolProvider: {
      has: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
    } as unknown as ToolHandlerContext['toolProvider'],
    runner: {
      runTool: jest.fn(),
      runInternalTool: jest.fn(),
      runAgent: jest.fn(),
    } as unknown as ToolHandlerContext['runner'],
    resultStore: {
      has: jest.fn(),
      get: jest.fn(),
      add: jest.fn(),
      delete: jest.fn(),
      asReadonly: jest.fn(),
    } as unknown as ToolHandlerContext['resultStore'],
    events: {
      reportProgress: jest.fn(),
      sendUiEvent: jest.fn(),
    } as unknown as ToolHandlerContext['events'],
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as ToolHandlerContext['logger'],
    prompts: {
      checkConfirmationStatus: jest.fn(),
      askForConfirmation: jest.fn(),
    } as unknown as ToolHandlerContext['prompts'],
    stateManager: {
      getState: jest.fn(),
      setState: jest.fn(),
    } as unknown as ToolHandlerContext['stateManager'],
    attachments: {} as unknown as ToolHandlerContext['attachments'],
    filestore: {
      read: jest.fn(),
      ls: jest.fn(),
      glob: jest.fn(),
      grep: jest.fn(),
    } as unknown as ToolHandlerContext['filestore'],
    skills: {
      list: jest.fn(),
      get: jest.fn(),
      bulkGet: jest.fn(),
      convertSkillTool: jest.fn(),
    } as unknown as ToolHandlerContext['skills'],
    toolManager: {
      setEventEmitter: jest.fn(),
      addTools: jest.fn(),
      list: jest.fn(),
      recordToolUse: jest.fn(),
      getToolIdMapping: jest.fn(),
      getDynamicToolIds: jest.fn(),
      getSummarizer: jest.fn(),
    } as unknown as ToolHandlerContext['toolManager'],
    runContext: {
      runId: 'test-run-id',
      stack: [],
    } as unknown as ToolHandlerContext['runContext'],
  };
};
