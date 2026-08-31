/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { IUiSettingsClient } from '@kbn/core/server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools/handler';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ZodObject } from '@kbn/zod/v4';
import type { z } from '@kbn/zod/v4';
import type { AttachmentClient } from '@kbn/streams-plugin/server';
import type { KnowledgeIndicatorClient } from '../../lib/knowledge_indicators';
import type { RouteHandlerScopedClients, GetScopedClients } from '../../routes/types';

/**
 * Subset of RouteHandlerScopedClients that tools actually use.
 * Using Pick ensures property names and types stay in sync with the
 * real interface — renames or type changes cause a compile error here.
 */
type ToolScopedClients = Pick<
  RouteHandlerScopedClients,
  'scopedClusterClient' | 'getKnowledgeIndicatorClient' | 'uiSettingsClient' | 'attachmentClient'
>;

export const createMockGetScopedClients = () => {
  const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  const esClient = scopedClusterClient.asCurrentUser;

  const uiSettingsClient: jest.Mocked<Pick<IUiSettingsClient, 'get'>> = {
    // Query streams enabled by default; individual tests can override.
    get: jest.fn().mockResolvedValue(true),
  };

  const kiClient: jest.Mocked<Pick<KnowledgeIndicatorClient, 'getStreamToQueryLinksMap'>> = {
    getStreamToQueryLinksMap: jest.fn().mockResolvedValue({}),
  };

  const getKnowledgeIndicatorClient = jest.fn().mockResolvedValue(kiClient);

  const attachmentClient: jest.Mocked<Pick<AttachmentClient, 'getAttachments'>> = {
    getAttachments: jest.fn().mockResolvedValue([]),
  };

  // Satisfies ensures property names stay in sync with RouteHandlerScopedClients.
  // If a property is renamed or removed from the interface, this will fail.
  const scopedClients: {
    [K in keyof ToolScopedClients]: unknown;
  } = {
    scopedClusterClient,
    getKnowledgeIndicatorClient,
    uiSettingsClient,
    attachmentClient,
  };

  const getScopedClients = jest
    .fn()
    .mockResolvedValue(scopedClients) as jest.MockedFunction<GetScopedClients>;

  return {
    getScopedClients,
    esClient,
    scopedClusterClient,
    getKnowledgeIndicatorClient,
    attachmentClient,
    uiSettingsClient,
  };
};

export const createMockRequest = () => httpServerMock.createKibanaRequest();

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

  const modelProvider = agentBuilderMocks.createModelProvider();
  modelProvider.getDefaultModel.mockResolvedValue({ inferenceClient } as never);
  const toolHandlerContext = agentBuilderMocks.tools.createHandlerContext();

  toolHandlerContext.modelProvider = modelProvider;
  return toolHandlerContext;
};
