/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  generateEsql: jest.fn(),
  GenerateEsqlNoDataError: class GenerateEsqlNoDataError extends Error {},
  setDefaultEsqlCacheKey: jest.fn(),
}));

import { generateEsql } from '@kbn/agent-builder-genai-utils';
import { generateEsqlTool } from './generate_esql';

const mockedGenerateEsql = jest.mocked(generateEsql);

const createHandlerContext = () => ({
  esClient: { asCurrentUser: {} },
  experimentalFeatures: { datasets: false },
  modelProvider: {},
  logger: {},
  events: {},
  attachments: { getActive: () => [] } as unknown as AttachmentStateManager,
});

describe('generateEsqlTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGenerateEsql.mockResolvedValue({ query: 'FROM logs' });
  });

  it('has the platform generate_esql tool id', () => {
    expect(generateEsqlTool().id).toBe(platformCoreTools.generateEsql);
  });

  it('defaults execute to data and accepts none and schema', () => {
    const parsed = generateEsqlTool().schema.parse({ query: 'count logs' });
    expect(parsed).toEqual(expect.objectContaining({ execute: 'data' }));
    expect(generateEsqlTool().schema.parse({ query: 'count logs', execute: 'none' }).execute).toBe(
      'none'
    );
    expect(generateEsqlTool().schema.parse({ query: 'count logs', execute: 'schema' }).execute).toBe(
      'schema'
    );
  });

  it('forwards execute to generateEsql', async () => {
    const tool = generateEsqlTool();
    const context = createHandlerContext() as any;

    await tool.handler({ query: 'count logs' }, context);
    expect(mockedGenerateEsql).toHaveBeenCalledWith(expect.objectContaining({ execute: 'data' }));

    await tool.handler({ query: 'count logs', execute: 'none' }, context);
    expect(mockedGenerateEsql).toHaveBeenCalledWith(expect.objectContaining({ execute: 'none' }));

    await tool.handler({ query: 'count logs', execute: 'schema' }, context);
    expect(mockedGenerateEsql).toHaveBeenCalledWith(expect.objectContaining({ execute: 'schema' }));
  });
});
