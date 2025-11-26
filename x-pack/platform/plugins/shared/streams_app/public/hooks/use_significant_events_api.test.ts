/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSignificantEventsApi } from './use_significant_events_api';
import { useKibana } from './use_kibana';
import { useAbortController } from '@kbn/react-hooks';

jest.mock('./use_kibana');
jest.mock('@kbn/react-hooks', () => ({
  useAbortController: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseAbortController = useAbortController as jest.MockedFunction<typeof useAbortController>;

describe('useSignificantEventsApi', () => {
  const mockStream = jest.fn();
  const mockAbort = jest.fn();
  const mockRefresh = jest.fn();
  const mockSignal = { aborted: false } as AbortSignal;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAbortController.mockReturnValue({
      signal: mockSignal,
      abort: mockAbort,
      refresh: mockRefresh,
    });

    mockUseKibana.mockReturnValue({
      dependencies: {
        start: {
          streams: {
            streamsRepositoryClient: {
              stream: mockStream,
              fetch: jest.fn(),
            },
          },
        },
      },
    } as any);
  });

  describe('generate', () => {
    it('should format dates as ISO strings when calling generate', () => {
      const start = 1704067200000; // 2024-01-01T00:00:00.000Z
      const end = 1704153600000; // 2024-01-02T00:00:00.000Z
      const connectorId = 'test-connector-id';
      const streamName = 'test-stream';

      const { result } = renderHook(() =>
        useSignificantEventsApi({
          name: streamName,
          start,
          end,
        })
      );

      result.current.generate(connectorId);

      expect(mockStream).toHaveBeenCalledTimes(1);
      expect(mockStream).toHaveBeenCalledWith(
        'POST /api/streams/{name}/significant_events/_generate 2023-10-31',
        {
          signal: mockSignal,
          params: {
            path: {
              name: streamName,
            },
            query: {
              connectorId,
              from: new Date(start).toISOString(),
              to: new Date(end).toISOString(),
            },
            body: {
              feature: undefined,
            },
          },
        }
      );

      // Verify the dates are in ISO format (not locale-specific toString format)
      const callArgs = mockStream.mock.calls[0][1];
      expect(callArgs.params.query.from).toBe('2024-01-01T00:00:00.000Z');
      expect(callArgs.params.query.to).toBe('2024-01-02T00:00:00.000Z');
      expect(callArgs.params.query.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(callArgs.params.query.to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should format dates as ISO strings with feature parameter', () => {
      const start = 1704067200000;
      const end = 1704153600000;
      const connectorId = 'test-connector-id';
      const streamName = 'test-stream';
      const feature = {
        name: 'test-feature',
        description: 'Test feature description',
      };

      const { result } = renderHook(() =>
        useSignificantEventsApi({
          name: streamName,
          start,
          end,
        })
      );

      result.current.generate(connectorId, feature);

      expect(mockStream).toHaveBeenCalledTimes(1);
      const callArgs = mockStream.mock.calls[0][1];
      expect(callArgs.params.query.from).toBe(new Date(start).toISOString());
      expect(callArgs.params.query.to).toBe(new Date(end).toISOString());
      expect(callArgs.params.body.feature).toEqual(feature);
    });

    it('should handle different timezone dates correctly', () => {
      // Test with dates that would produce different toString() results in different timezones
      const start = 946684800000; // 2000-01-01T00:00:00.000Z
      const end = 978307200000; // 2001-01-01T00:00:00.000Z
      const connectorId = 'test-connector-id';
      const streamName = 'test-stream';

      const { result } = renderHook(() =>
        useSignificantEventsApi({
          name: streamName,
          start,
          end,
        })
      );

      result.current.generate(connectorId);

      const callArgs = mockStream.mock.calls[0][1];
      // Verify ISO format is used regardless of local timezone
      expect(callArgs.params.query.from).toBe('2000-01-01T00:00:00.000Z');
      expect(callArgs.params.query.to).toBe('2001-01-01T00:00:00.000Z');
    });
  });
});

