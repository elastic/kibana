/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHandler, resolveToolParameters } from './create_handler';
import type { EsqlToolConfig } from '@kbn/agent-builder-common';

// Mock the ES client
const mockEsClient = {
  asCurrentUser: {
    esql: {
      query: jest.fn(),
    },
  },
};

const mockContext = {
  esClient: mockEsClient,
};

describe('createHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient.asCurrentUser.esql.query.mockResolvedValue({
      columns: [{ name: 'count', type: 'long' }],
      values: [[42]],
    });
  });

  describe('default value handling', () => {
    it('should use default values when LLM omits parameters', async () => {
      const config: EsqlToolConfig = {
        query: 'FROM users | WHERE status == ?status AND name == ?name',
        params: {
          status: { type: 'string', description: 'User status', optional: true },
          name: {
            type: 'string',
            description: 'User name',
            optional: true,
            defaultValue: 'John Doe',
          },
        },
      };

      const handler = createHandler(config);
      const llmParams = { status: 'active' }; // LLM omits 'name'

      await handler(llmParams, mockContext as any);

      // Verify ES|QL was called with both parameters (LLM value + default)
      expect(mockEsClient.asCurrentUser.esql.query).toHaveBeenCalledWith({
        query: 'FROM users | WHERE status == ?status AND name == ?name',
        params: [{ status: 'active' }, { name: 'John Doe' }],
      });
    });

    it('should use LLM values when provided, overriding defaults', async () => {
      const config: EsqlToolConfig = {
        query: 'FROM users | WHERE status == ?status AND name == ?name',
        params: {
          status: { type: 'string', description: 'User status', optional: true },
          name: {
            type: 'string',
            description: 'User name',
            optional: true,
            defaultValue: 'John Doe',
          },
        },
      };

      const handler = createHandler(config);
      const llmParams = { status: 'active', name: 'Jane Smith' }; // LLM provides both

      await handler(llmParams, mockContext as any);

      // Verify ES|QL was called with LLM values (not defaults)
      expect(mockEsClient.asCurrentUser.esql.query).toHaveBeenCalledWith({
        query: 'FROM users | WHERE status == ?status AND name == ?name',
        params: [{ status: 'active' }, { name: 'Jane Smith' }],
      });
    });

    it('should use null for optional parameters without defaults', async () => {
      const config: EsqlToolConfig = {
        query: 'FROM users | WHERE status == ?status',
        params: {
          status: { type: 'string', description: 'User status', optional: true },
          name: { type: 'string', description: 'User name', optional: true }, // No default
        },
      };

      const handler = createHandler(config);
      const llmParams = { status: 'active' }; // LLM omits 'name'

      await handler(llmParams, mockContext as any);

      // Verify ES|QL was called with null for missing parameter
      expect(mockEsClient.asCurrentUser.esql.query).toHaveBeenCalledWith({
        query: 'FROM users | WHERE status == ?status',
        params: [{ status: 'active' }, { name: null }],
      });
    });
  });
});

describe('resolveToolParameters', () => {
  const mockParamDefinitions: EsqlToolConfig['params'] = {
    status: {
      type: 'string',
      description: 'User status',
      optional: true,
      defaultValue: 'active',
    },
    name: {
      type: 'string',
      description: 'User name',
      optional: true,
    },
  };

  it('should use provided values when available', () => {
    const providedParams = { status: 'inactive', name: 'Jane Smith' };
    const result = resolveToolParameters(mockParamDefinitions, providedParams);

    expect(result).toEqual({
      status: 'inactive',
      name: 'Jane Smith',
    });
  });

  it('should apply default values for missing optional parameters', () => {
    const providedParams = { name: 'Jane Smith' };
    const result = resolveToolParameters(mockParamDefinitions, providedParams);

    expect(result).toEqual({
      status: 'active', // default value
      name: 'Jane Smith',
    });
  });

  it('should use null for missing optional parameters without defaults', () => {
    const providedParams = { status: 'inactive' };
    const result = resolveToolParameters(mockParamDefinitions, providedParams);

    expect(result).toEqual({
      status: 'inactive',
      name: null, // no default, so null
    });
  });

  it('should preserve falsy provided values (0, false, empty string)', () => {
    const paramDefinitions: EsqlToolConfig['params'] = {
      count: { type: 'integer', description: 'Count', optional: true, defaultValue: 5 },
      enabled: { type: 'boolean', description: 'Enabled', optional: true, defaultValue: true },
      name: { type: 'string', description: 'Name', optional: true, defaultValue: 'default' },
    };

    const providedParams = { count: 0, enabled: false, name: '' };
    const result = resolveToolParameters(paramDefinitions, providedParams);

    expect(result).toEqual({ count: 0, enabled: false, name: '' });
  });

  it('should use null for missing required parameters', () => {
    const paramDefinitions: EsqlToolConfig['params'] = {
      requiredParam: { type: 'string', description: 'Required param' },
    };

    const result = resolveToolParameters(paramDefinitions, {});
    expect(result).toEqual({ requiredParam: null });
  });
});
