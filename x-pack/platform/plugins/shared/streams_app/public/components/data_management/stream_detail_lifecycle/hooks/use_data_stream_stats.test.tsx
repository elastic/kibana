/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import { useDataStreamStats } from './use_data_stream_stats';

// Mock dependencies
jest.mock('../../../../hooks/use_streams_app_fetch');
jest.mock('../../../../hooks/use_kibana');
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';

const mockUseStreamsAppFetch = useStreamsAppFetch as jest.MockedFunction<typeof useStreamsAppFetch>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useDataStreamStats', () => {
  const mockClient = { getDataStreamsStats: jest.fn() };
  const def = (name = 'logs-test'): Streams.ingest.all.GetResponse => ({ stream: { name } } as any);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: { dataStreamsClient: Promise.resolve(mockClient) },
    } as any);
  });

  // We'll override the fetch hook per test with a synchronous resolved value to avoid re-render issues

  it('computes bytesPerDay = sizeBytes when creation date is now (days clamp to 1)', () => {
    const nowIso = new Date().toISOString();
    mockUseStreamsAppFetch.mockImplementation(
      () =>
        ({
          value: {
            sizeBytes: 2_000_000,
            totalDocs: 2000,
            creationDate: nowIso,
            bytesPerDay: 2_000_000, // since clamped days = 1
            bytesPerDoc: 1000,
          },
          loading: false,
          error: undefined,
          refresh: jest.fn(),
        } as any)
    );
    const { result } = renderHook(() => useDataStreamStats({ definition: def() }));
    expect(result.current.stats).toBeDefined();
    expect(result.current.stats?.bytesPerDay).toBe(2_000_000);
    expect(result.current.stats?.bytesPerDoc).toBe(1000);
  });
});
