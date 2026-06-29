/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';
import { getEffectiveLifecycle } from '../../../../lib/streams/lifecycle/get_effective_lifecycle';
import { internalLifecycleRoutes } from './route';

jest.mock('../../../../lib/streams/lifecycle/get_effective_lifecycle');

jest.mock('@kbn/streams-schema', () => {
  const actual = jest.requireActual('@kbn/streams-schema');
  return {
    ...actual,
    Streams: {
      ...actual.Streams,
      ingest: {
        ...actual.Streams.ingest,
        all: {
          ...actual.Streams.ingest.all,
          Definition: { is: jest.fn().mockReturnValue(true) },
        },
      },
    },
    isIlmLifecycle: jest.fn().mockReturnValue(false),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Streams, isIlmLifecycle } = require('@kbn/streams-schema');
const mockGetEffectiveLifecycle = getEffectiveLifecycle as jest.MockedFunction<
  typeof getEffectiveLifecycle
>;

const route = internalLifecycleRoutes['GET /internal/streams/{name}/lifecycle/_dsl_phase_stats'];

type HandlerParams = Parameters<typeof route.handler>[0];

const mockWarn = jest.fn();

const callHandler = ({
  name,
  searchResult,
  statsResult,
  settingsResult,
  searchError,
}: {
  name: string;
  searchResult?: unknown;
  statsResult?: IndicesStatsResponse;
  settingsResult?: Record<string, unknown>;
  searchError?: Error;
}) => {
  const search = searchError
    ? jest.fn().mockRejectedValue(searchError)
    : jest.fn().mockResolvedValue(searchResult ?? { aggregations: undefined });
  const stats = jest.fn().mockResolvedValue(statsResult ?? { indices: {} });
  const getSettings = jest.fn().mockResolvedValue(settingsResult ?? {});

  const getScopedClients = jest.fn().mockResolvedValue({
    scopedClusterClient: { asCurrentUser: { search, indices: { stats, getSettings } } },
    streamsClient: {
      getStream: jest.fn().mockResolvedValue({ name }),
      getDataStream: jest.fn().mockResolvedValue({ name }),
    },
  });

  const telemetry = {
    startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
    reportStreamsStateError: jest.fn(),
  };

  const handlerParams = {
    params: { path: { name } },
    request: {},
    getScopedClients,
    response: {},
    logger: { error: jest.fn(), warn: mockWarn },
    context: {},
    telemetry,
  } as unknown as HandlerParams;

  return route.handler(handlerParams);
};

beforeEach(() => {
  jest.clearAllMocks();
  (Streams.ingest.all.Definition.is as jest.Mock).mockReturnValue(true);
  (isIlmLifecycle as jest.Mock).mockReturnValue(false);
  mockGetEffectiveLifecycle.mockResolvedValue({
    dsl: { data_retention: '30d', frozen_after: '10s' },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
});

describe('lifecycle _dsl_phase_stats route', () => {
  it('sums size and docs per phase from the _tier allocation', async () => {
    const result = await callHandler({
      name: 'my-stream',
      searchResult: {
        aggregations: {
          tiers: {
            buckets: {
              data_hot: { indices: { buckets: [{ key: '.ds-hot' }] } },
              data_frozen: {
                indices: { buckets: [{ key: '.ds-frozen-a' }, { key: '.ds-frozen-b' }] },
              },
            },
          },
        },
      },
      statsResult: {
        indices: {
          '.ds-hot': {
            total: { store: { total_data_set_size_in_bytes: 100 } },
            primaries: { docs: { count: 10 } },
          },
          '.ds-frozen-a': {
            total: { store: { total_data_set_size_in_bytes: 200 } },
            primaries: { docs: { count: 20 } },
          },
          '.ds-frozen-b': {
            total: { store: { total_data_set_size_in_bytes: 300 } },
            primaries: { docs: { count: 30 } },
          },
        },
      } as unknown as IndicesStatsResponse,
    });

    expect(result).toEqual({
      phases: {
        hot: { size_in_bytes: 100, docs_count: 10 },
        frozen: { size_in_bytes: 500, docs_count: 50 },
      },
    });
  });

  it('skips tiers that do not map to a known phase', async () => {
    const result = await callHandler({
      name: 'my-stream',
      searchResult: {
        aggregations: {
          tiers: {
            buckets: {
              data_warm: { indices: { buckets: [{ key: '.ds-warm' }] } },
            },
          },
        },
      },
      statsResult: {
        indices: {
          '.ds-warm': {
            total: { store: { total_data_set_size_in_bytes: 999 } },
            primaries: { docs: { count: 9 } },
          },
        },
      } as unknown as IndicesStatsResponse,
    });

    expect(result).toEqual({ phases: {} });
  });

  it('attributes an empty backing index to its phase via _tier_preference', async () => {
    // No `_tier` buckets because the index holds no documents, but its store overhead should still
    // be attributed to the hot phase via the `_tier_preference` setting (matching ILM behavior).
    const result = await callHandler({
      name: 'my-stream',
      searchResult: { aggregations: { tiers: { buckets: {} } } },
      statsResult: {
        indices: {
          '.ds-empty-hot': {
            total: { store: { total_data_set_size_in_bytes: 249 } },
            primaries: { docs: { count: 0 } },
          },
        },
      } as unknown as IndicesStatsResponse,
      settingsResult: {
        '.ds-empty-hot': {
          settings: {
            index: { routing: { allocation: { include: { _tier_preference: 'data_hot' } } } },
          },
        },
      },
    });

    expect(result).toEqual({
      phases: {
        hot: { size_in_bytes: 249, docs_count: 0 },
      },
    });
  });

  it('prefers the runtime _tier over the _tier_preference setting', async () => {
    // A frozen searchable-snapshot index keeps a `data_hot,...` preference but is mounted on frozen;
    // the runtime `_tier` allocation must win over the setting.
    const result = await callHandler({
      name: 'my-stream',
      searchResult: {
        aggregations: {
          tiers: { buckets: { data_frozen: { indices: { buckets: [{ key: '.ds-frozen' }] } } } },
        },
      },
      statsResult: {
        indices: {
          '.ds-frozen': {
            total: { store: { total_data_set_size_in_bytes: 500 } },
            primaries: { docs: { count: 50 } },
          },
        },
      } as unknown as IndicesStatsResponse,
      settingsResult: {
        '.ds-frozen': {
          settings: {
            index: {
              routing: { allocation: { include: { _tier_preference: 'data_hot,data_warm' } } },
            },
          },
        },
      },
    });

    expect(result).toEqual({
      phases: {
        frozen: { size_in_bytes: 500, docs_count: 50 },
      },
    });
  });

  it('returns empty phases and logs a warning when the ES search throws', async () => {
    const searchError = new Error('search_phase_execution_exception');
    const result = await callHandler({ name: 'my-stream', searchError });

    expect(result).toEqual({ phases: {} });
    expect(mockWarn).toHaveBeenCalledWith('Failed to fetch DSL phase stats', {
      error: searchError,
    });
  });

  it('rejects ILM streams with a 400', async () => {
    (isIlmLifecycle as jest.Mock).mockReturnValue(true);

    await expect(callHandler({ name: 'ilm-stream' })).rejects.toThrow(
      'DSL phase stats are only available for data stream lifecycle (DSL) streams'
    );
  });

  it('rejects non-ingest streams with a 400', async () => {
    (Streams.ingest.all.Definition.is as jest.Mock).mockReturnValue(false);

    await expect(callHandler({ name: 'group-stream' })).rejects.toThrow(
      'Lifecycle phase stats are only available for ingest streams'
    );
  });
});
