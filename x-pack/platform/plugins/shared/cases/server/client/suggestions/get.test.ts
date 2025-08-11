/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaRequest } from '@kbn/core/server';
import { getAllForOwner } from './get';
import type { SuggestionHandlerResponse } from '../../../common/types/domain';
import type { CasesClientArgs } from '../types';
import type { GetAllForOwnerArgs } from './types';
import { loggerMock } from '@kbn/logging-mocks';

describe('getAllForOwner', () => {
  it('calls attachmentSuggestionRegistry.getAllSuggestionsForOwner and returns suggestions', async () => {
    const mockSuggestions: SuggestionHandlerResponse = {
      suggestions: [
        {
          id: 'test-id',
          description: 'desc',
          data: [],
        },
      ],
    };

    const attachmentSuggestionRegistry = {
      getAllSuggestionsForOwner: jest.fn().mockResolvedValue(mockSuggestions),
    };

    const clientArgs = {
      attachmentSuggestionRegistry,
      logger: loggerMock.create(),
    } as unknown as CasesClientArgs;

    const args: GetAllForOwnerArgs = {
      owner: 'observability',
      context: {
        'service.name': ['my-service'],
        timeRange: {
          from: '2023-01-01T00:00:00Z',
          to: '2023-01-02T00:00:00Z',
        },
      },
      request: {
        params: {
          owner: 'observability',
        },
        body: {},
      } as KibanaRequest,
    };

    const result = await getAllForOwner(args, clientArgs);

    expect(attachmentSuggestionRegistry.getAllSuggestionsForOwner).toHaveBeenCalledWith(
      args.owner,
      args.context,
      args.request,
      clientArgs.logger
    );
    expect(result).toBe(mockSuggestions);
  });
});
