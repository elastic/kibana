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
  const mockedTool: ToolPersistedDefinition = {
    id: 'tool-1',
    type: ToolType.esql,
    description: 'desc',
    tags: [],
    configuration: {
      query: 'FROM idx | WHERE field == ?param1',
      params: {
        param1: { type: 'string', description: 'd' },
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

  const mockedDefinition: ToolTypeDefinition = {
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

  const mockedContext: ToolTypeConversionContext = {
    request: {} as KibanaRequest,
    spaceId: 'default',
    esClient: {} as ElasticsearchClient,
  };

  it('applies toolType convertFromPersistence before building dynamic props', async () => {
    const internal = convertPersistedDefinition({
      tool: mockedTool,
      definition: mockedDefinition,
      context: mockedContext,
    });

    expect(internal.configuration).toEqual(mockedTool.configuration);
    await internal.getSchema();
    expect(mockedDefinition.convertFromPersistence).toHaveBeenCalledWith(
      mockedTool.configuration,
      mockedContext
    );
    expect(mockedDefinition.getDynamicProps).toHaveBeenCalledWith(convertedConfig, {
      request: mockedContext.request,
      spaceId: mockedContext.spaceId,
    });
  });

  it('works when convertFromPersistence is not defined', async () => {
    const definition: ToolTypeDefinition = {
      ...mockedDefinition,
      // convertFromPersistence is not defined
      convertFromPersistence: undefined,
    };

    const internal = convertPersistedDefinition({
      tool: mockedTool,
      definition,
      context: mockedContext,
    });

    expect(internal.configuration).toEqual(mockedTool.configuration);
    await internal.getSchema();
    expect(definition.getDynamicProps).toHaveBeenCalledWith(mockedTool.configuration, {
      request: mockedContext.request,
      spaceId: mockedContext.spaceId,
    });
  });
});
