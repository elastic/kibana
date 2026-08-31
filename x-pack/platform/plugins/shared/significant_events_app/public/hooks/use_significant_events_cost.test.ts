/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import {
  SIGNIFICANT_EVENTS_COST_QUERY_KEY,
  useSetSignificantEventsTokenTracking,
  useSignificantEventsCost,
} from './use_significant_events_cost';

jest.mock('@kbn/react-query');
jest.mock('./use_kibana');

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('significant events cost hooks', () => {
  const fetch = jest.fn();
  const invalidateQueries = jest.fn();
  const mutateAsync = jest.fn();
  const addSuccess = jest.fn();
  const addWarning = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      dependencies: {
        start: {
          significantEvents: {
            significantEventsRepositoryClient: { fetch },
          },
        },
      },
      core: {
        notifications: {
          toasts: {
            addSuccess,
            addWarning,
            addError: jest.fn(),
          },
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
    mockUseQuery.mockReturnValue({} as ReturnType<typeof useQuery>);
    mockUseQueryClient.mockReturnValue({
      invalidateQueries,
    } as unknown as ReturnType<typeof useQueryClient>);
    mockUseMutation.mockReturnValue({
      mutateAsync,
      isLoading: false,
    } as unknown as ReturnType<typeof useMutation>);
  });

  it('fetches on mount and explicit refresh without polling or focus refresh', async () => {
    fetch.mockResolvedValue({ asOf: '2026-08-31T12:00:00.000Z' });

    useSignificantEventsCost();

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: SIGNIFICANT_EVENTS_COST_QUERY_KEY,
        enabled: true,
        refetchInterval: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
      })
    );
    const options = mockUseQuery.mock.calls[0][0] as unknown as {
      queryFn: (context: QueryFunctionContext) => Promise<unknown>;
    };
    await options.queryFn({
      queryKey: SIGNIFICANT_EVENTS_COST_QUERY_KEY,
      signal: new AbortController().signal,
      meta: undefined,
    });
    expect(fetch).toHaveBeenCalledWith(
      'GET /internal/significant_events/cost',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('updates all-space tracking and invalidates only the cost query', async () => {
    useSetSignificantEventsTokenTracking();

    const options = mockUseMutation.mock.calls[0][0] as unknown as {
      mutationFn: (variables: { enabled: boolean }) => Promise<unknown>;
      onSettled: () => Promise<void>;
    };
    fetch.mockResolvedValue({
      enabled: true,
      auditRecorded: true,
      updatedSpaceIds: ['default'],
      failedSpaces: [],
    });
    await options.mutationFn({ enabled: true });
    await options.onSettled();

    expect(fetch).toHaveBeenCalledWith(
      'PUT /internal/significant_events/cost/token_usage_tracking',
      {
        signal: null,
        params: { body: { enabled: true } },
      }
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: SIGNIFICANT_EVENTS_COST_QUERY_KEY,
    });
  });

  it('warns when settings changed but the coverage audit was not recorded', () => {
    useSetSignificantEventsTokenTracking();

    const options = mockUseMutation.mock.calls[0][0] as unknown as {
      onSuccess: (result: {
        enabled: boolean;
        auditRecorded: boolean;
        updatedSpaceIds: string[];
        failedSpaces: [];
      }) => void;
    };
    options.onSuccess({
      enabled: true,
      auditRecorded: false,
      updatedSpaceIds: ['default'],
      failedSpaces: [],
    });

    expect(addWarning).toHaveBeenCalledWith({
      title:
        'Token tracking changed, but its coverage record could not be saved. Retry the same action.',
    });
    expect(addSuccess).not.toHaveBeenCalled();
  });
});
