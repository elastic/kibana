/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerDataStreamRoutes } from './data_stream_routes';
import type { AutomaticImportPluginRequestHandlerContext } from '../types';

describe('Data stream routes - upload samples', () => {
  const uploadPath =
    '/api/automatic_import/integrations/{integration_id}/data_streams/{data_stream_id}/upload';
  let routeHandler: (
    context: AutomaticImportPluginRequestHandlerContext,
    request: unknown,
    response: unknown
  ) => Promise<unknown>;
  let mockAddSamplesToDataStream: jest.Mock;
  let mockEsSearch: jest.Mock;
  let mockGetCurrentUser: jest.Mock;
  let mockResponse: { ok: jest.Mock; badRequest: jest.Mock };

  const createMockContext = (): AutomaticImportPluginRequestHandlerContext =>
    ({
      automaticImport: Promise.resolve({
        automaticImportService: {
          addSamplesToDataStream: mockAddSamplesToDataStream,
        },
        getCurrentUser: mockGetCurrentUser,
        esClient: { search: mockEsSearch },
        isAvailable: () => true,
      }),
    } as unknown as AutomaticImportPluginRequestHandlerContext);

  beforeEach(() => {
    mockAddSamplesToDataStream = jest.fn().mockResolvedValue({ items: [], errors: false });
    mockEsSearch = jest.fn();
    mockGetCurrentUser = jest.fn().mockResolvedValue({ username: 'test-user' });
    mockResponse = {
      ok: jest.fn().mockReturnValue({}),
      badRequest: jest.fn().mockReturnValue({}),
    };

    const routeHandlers: Record<string, { handler: typeof routeHandler }> = {};
    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation((config: { path: string }) => ({
          addVersion: jest
            .fn()
            .mockImplementation((_versionConfig: unknown, handler: typeof routeHandler) => {
              routeHandlers[`POST:${config.path}`] = { handler };
              return { addVersion: jest.fn() };
            }),
        })),
        delete: jest.fn().mockReturnValue({ addVersion: jest.fn() }),
        patch: jest.fn().mockReturnValue({ addVersion: jest.fn() }),
        get: jest.fn().mockReturnValue({ addVersion: jest.fn() }),
        put: jest.fn().mockReturnValue({ addVersion: jest.fn() }),
      },
    };

    registerDataStreamRoutes(
      mockRouter as unknown as IRouter<AutomaticImportPluginRequestHandlerContext>,
      loggingSystemMock.create().get()
    );
    routeHandler = routeHandlers[`POST:${uploadPath}`]?.handler;
    expect(routeHandler).toBeDefined();
  });

  describe('when body has samples (file upload)', () => {
    it('calls addSamplesToDataStream with provided samples and originalSource', async () => {
      const request = {
        params: { integration_id: 'int_1', data_stream_id: 'ds_1' },
        body: {
          samples: ['line1', 'line2'],
          originalSource: { sourceType: 'file' as const, sourceValue: 'app.log' },
        },
      };

      await routeHandler!(createMockContext(), request, mockResponse);

      expect(mockEsSearch).not.toHaveBeenCalled();
      expect(mockAddSamplesToDataStream).toHaveBeenCalledTimes(1);
      expect(mockAddSamplesToDataStream).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: 'int_1',
          dataStreamId: 'ds_1',
          rawSamples: ['line1', 'line2'],
          originalSource: { sourceType: 'file', sourceValue: 'app.log' },
          createdBy: 'test-user',
        })
      );
      expect(mockResponse.ok).toHaveBeenCalled();
      expect(mockResponse.badRequest).not.toHaveBeenCalled();
    });
  });

  describe('when body has sourceIndex (index-based sampling)', () => {
    it('searches the index for event.original and calls addSamplesToDataStream with extracted samples', async () => {
      mockEsSearch.mockResolvedValue({
        hits: {
          hits: [
            { _source: { event: { original: 'log line one' } } },
            { _source: { event: { original: 'log line two' } } },
          ],
        },
      });

      const request = {
        params: { integration_id: 'int_1', data_stream_id: 'ds_1' },
        body: {
          sourceIndex: 'logs-*',
          originalSource: { sourceType: 'index' as const, sourceValue: 'logs-*' },
        },
      };

      await routeHandler!(createMockContext(), request, mockResponse);

      expect(mockEsSearch).toHaveBeenCalledTimes(1);
      expect(mockEsSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'logs-*',
          size: 100,
          _source: ['event.original'],
          query: {
            function_score: {
              query: { exists: { field: 'event.original' } },
              functions: [{ random_score: {} }],
            },
          },
        })
      );
      expect(mockAddSamplesToDataStream).toHaveBeenCalledTimes(1);
      expect(mockAddSamplesToDataStream).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: 'int_1',
          dataStreamId: 'ds_1',
          rawSamples: ['log line one', 'log line two'],
          originalSource: { sourceType: 'index', sourceValue: 'logs-*' },
          createdBy: 'test-user',
        })
      );
      expect(mockResponse.ok).toHaveBeenCalled();
      expect(mockResponse.badRequest).not.toHaveBeenCalled();
    });

    it('rejects sourceIndex starting with a dot (system indices)', async () => {
      const request = {
        params: { integration_id: 'int_1', data_stream_id: 'ds_1' },
        body: {
          sourceIndex: '.kibana_task_manager',
          originalSource: { sourceType: 'index' as const, sourceValue: '.kibana_task_manager' },
        },
      };

      await routeHandler!(createMockContext(), request, mockResponse);

      expect(mockEsSearch).not.toHaveBeenCalled();
      expect(mockAddSamplesToDataStream).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Reading from system indices is not allowed.',
        })
      );
      expect(mockResponse.ok).not.toHaveBeenCalled();
    });

    it('returns badRequest when index has no documents with event.original', async () => {
      mockEsSearch.mockResolvedValue({ hits: { hits: [] } });

      const request = {
        params: { integration_id: 'int_1', data_stream_id: 'ds_1' },
        body: {
          sourceIndex: 'empty-index',
          originalSource: { sourceType: 'index' as const, sourceValue: 'empty-index' },
        },
      };

      await routeHandler!(createMockContext(), request, mockResponse);

      expect(mockEsSearch).toHaveBeenCalledTimes(1);
      expect(mockAddSamplesToDataStream).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'No documents with event.original found in the specified index.',
        })
      );
      expect(mockResponse.ok).not.toHaveBeenCalled();
    });

    it('filters out hits without event.original or with empty string', async () => {
      mockEsSearch.mockResolvedValue({
        hits: {
          hits: [
            { _source: { event: { original: 'valid' } } },
            { _source: {} },
            { _source: { event: {} } },
            { _source: { event: { original: '' } } },
          ],
        },
      });

      const request = {
        params: { integration_id: 'int_1', data_stream_id: 'ds_1' },
        body: {
          sourceIndex: 'logs-*',
          originalSource: { sourceType: 'index' as const, sourceValue: 'logs-*' },
        },
      };

      await routeHandler!(createMockContext(), request, mockResponse);

      expect(mockAddSamplesToDataStream).toHaveBeenCalledWith(
        expect.objectContaining({
          rawSamples: ['valid'],
          createdBy: 'test-user',
        })
      );
      expect(mockResponse.ok).toHaveBeenCalled();
    });
  });
});
