/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaRequest } from '@kbn/core/server';
import { getAllForOwners } from './get';
import type { SuggestionHandlerResponse } from '../../../common/types/domain';
import type { CasesClientArgs } from '../types';
import type { GetAllForOwnersArgs } from './types';
import { loggerMock } from '@kbn/logging-mocks';

describe('getAllForOwners', () => {
  it('calls attachmentSuggestionRegistry.getAllSuggestionsForOwners and returns suggestions', async () => {
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
      getAllSuggestionsForOwners: jest.fn().mockResolvedValue(mockSuggestions),
    };

    const clientArgs = {
      attachmentSuggestionRegistry,
      logger: loggerMock.create(),
    } as unknown as CasesClientArgs;

    const args: GetAllForOwnersArgs = {
      owners: ['observability'],
      context: {
        spaceId: 'default',
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

    const result = await getAllForOwners(args, clientArgs);

    expect(attachmentSuggestionRegistry.getAllSuggestionsForOwners).toHaveBeenCalledWith(
      args.owners,
      args.context,
      args.request,
      clientArgs.logger
    );
    expect(result).toBe(mockSuggestions);
  });
});
