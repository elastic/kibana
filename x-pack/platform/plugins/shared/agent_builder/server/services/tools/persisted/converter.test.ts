/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolTypeConversionContext, ToolTypeDefinition } from '../tool_types/definitions';
import { convertPersistedDefinition } from './converter';
import type { ToolPersistedDefinition } from './client';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ToolType } from '@kbn/agent-builder-common';

describe('convertPersistedDefinition', () => {
  it('applies toolType convertFromPersistence before building dynamic props', async () => {
    const tool: ToolPersistedDefinition = {
      id: 'tool-1',
      type: ToolType.esql,
      description: 'desc',
      tags: [],
      configuration: {
        query: 'FROM idx | WHERE field == ?param1',
        params: {
          param1: { type: 'text', description: 'd' },
        },
      } as any,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-02T00:00:00.000Z',
    };

    const convertedConfig = {
      query: 'FROM idx | WHERE field == ?param1',
      params: {
        param1: { type: 'string', description: 'd' },
      },
    };

    const definition: ToolTypeDefinition = {
      toolType: ToolType.esql,
      convertFromPersistence: jest.fn(() => convertedConfig as any),
      getDynamicProps: jest.fn(() => {
        return {
          getSchema: jest.fn(async () => ({} as any)),
          getHandler: jest.fn(async () => (async () => ({ results: [] })) as any),
        };
      }),
      // Not used by this test
      createSchema: {} as any,
      updateSchema: {} as any,
      validateForCreate: jest.fn(async ({ config }) => config as any),
      validateForUpdate: jest.fn(async ({ current }) => current as any),
    };

    const context: ToolTypeConversionContext = {
      request: {} as KibanaRequest,
      spaceId: 'default',
      esClient: {} as ElasticsearchClient,
    };

    const internal = convertPersistedDefinition({ tool, definition, context });

    expect(internal.configuration).toEqual(convertedConfig);
    await internal.getSchema();
    expect(definition.convertFromPersistence).toHaveBeenCalledWith(tool.configuration, context);
    expect(definition.getDynamicProps).toHaveBeenCalledWith(convertedConfig, {
      request: context.request,
      spaceId: context.spaceId,
    });
  });
});
