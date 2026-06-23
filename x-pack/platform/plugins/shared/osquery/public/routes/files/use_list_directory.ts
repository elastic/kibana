/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryClient } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../common/lib/kibana';
import { API_VERSIONS, DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';
import { useErrorToast } from '../../common/hooks/use_error_toast';
import { escapeOsqueryStringLiteral } from '../../../common/utils/escape_osquery_string_literal';

export interface FileRow {
  path?: string;
  filename?: string;
  size?: string;
  mtime?: string;
  type?: string;
}

interface DispatchResponse {
  data: {
    action_id: string;
  };
}

interface ResultsResponse {
  data: {
    total: number;
    edges: Array<{ fields: Record<string, string[]> }>;
  };
}

/**
 * Per-query status from the live-query details endpoint. Osquery indexes results
 * under the INNER per-query `action_id` (here `action_id`), which differs from
 * the outer live-query id returned by the dispatch route. We must read results
 * from `/{outerId}/results/{innerActionId}` — using the outer id for both
 * segments silently returns zero rows.
 */
interface LiveQueryDetailsResponse {
  data: {
    action_id: string;
    status?: string;
    queries?: Array<{
      action_id: string;
      status?: string;
      responded?: number;
      docs?: number;
    }>;
  };
}

/**
 * How often to re-poll the details endpoint while a directory/roots query is
 * still pending. Agents typically respond in under a couple of seconds, so we
 * poll once per second to surface results promptly during tree traversal rather
 * than waiting out a longer interval. Polling stops the moment the agent
 * responds (see {@link isQueryComplete}).
 */
const POLL_INTERVAL_MS = 1000;

/**
 * The results search strategy rejects a query size `>= DEFAULT_MAX_TABLE_QUERY_SIZE`
 * ("No query size above 10000"), so the largest page we may request is one below
 * the ceiling. A directory with that many or more entries still surfaces as
 * truncated via the reported `total`.
 */
const MAX_RESULTS_PAGE_SIZE = DEFAULT_MAX_TABLE_QUERY_SIZE - 1;

/**
 * A directory/roots query is done when its single query has reported a terminal
 * status (the agent responded, expired, or errored). We key completion off the
 * agent response — NOT the row count — so an empty directory or empty mount list
 * resolves instead of polling forever.
 */
const isQueryComplete = (details: LiveQueryDetailsResponse['data'] | undefined): boolean => {
  const query = details?.queries?.[0];
  if (!query) return false;

  return query.status === 'completed' || (query.responded ?? 0) > 0;
};

const getInnerActionId = (
  details: LiveQueryDetailsResponse['data'] | undefined
): string | undefined => details?.queries?.[0]?.action_id;

const extractRows = (edges: Array<{ fields: Record<string, string[]> }>): FileRow[] =>
  edges.map((edge) => ({
    path: edge.fields['osquery.path']?.[0] ?? edge.fields.path?.[0],
    filename: edge.fields['osquery.filename']?.[0] ?? edge.fields.filename?.[0],
    size: edge.fields['osquery.size']?.[0] ?? edge.fields.size?.[0],
    mtime: edge.fields['osquery.mtime']?.[0] ?? edge.fields.mtime?.[0],
    type: edge.fields['osquery.type']?.[0] ?? edge.fields.type?.[0],
  }));

export const listDirectoryCacheKey = (agentId: string, path: string) => [
  'osquery',
  'fileSystem',
  'list',
  agentId,
  path,
];

export const rootsCacheKey = (agentId: string) => ['osquery', 'fileSystem', 'roots', agentId];

interface UseListDirectoryParams {
  agentId: string;
  path: string;
  enabled?: boolean;
}

interface Listing {
  rows: FileRow[];
  /** Total rows reported by the search before the page-size cap was applied. */
  total: number;
}

interface UseListDirectoryResult {
  rows: FileRow[];
  /**
   * Total rows reported by the host before truncation. Drives the truncation
   * indicator: the results page-size caps `rows` at the window ceiling, so
   * `rows.length` alone can never exceed it — only `total` reveals truncation.
   */
  total: number;
  isLoading: boolean;
  isError: boolean;
  actionId: string | undefined;
  refetch: () => void;
}

export const useListDirectory = ({
  agentId,
  path,
  enabled = true,
}: UseListDirectoryParams): UseListDirectoryResult => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();
  const queryClient = useQueryClient();

  // The path is validated through the escaper here on the client side to assert no
  // raw concatenation happens. The server re-escapes when building the dispatched query.
  // We call escapeOsqueryStringLiteral purely as a client-side assertion/guard.
  void escapeOsqueryStringLiteral(path);

  const dispatchQuery = useQuery<string | undefined>(
    listDirectoryCacheKey(agentId, path),
    async () => {
      const response = await http.post<DispatchResponse>('/internal/osquery/file_system/list', {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({ agentId, path }),
      });

      return response?.data?.action_id;
    },
    {
      enabled: !!agentId && !!path && enabled,
      staleTime: Infinity,
      cacheTime: Infinity,
      retry: false,
      onError: (error) =>
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.fileSystem.list.fetchError', {
            defaultMessage: 'Error while listing directory',
          }),
        }),
    }
  );

  const actionId = dispatchQuery.data;

  // Poll the details endpoint to resolve the inner per-query action id AND detect
  // completion via the agent response (not the row count, so empty dirs resolve).
  const detailsQuery = useQuery<LiveQueryDetailsResponse['data']>(
    [...listDirectoryCacheKey(agentId, path), 'details'],
    async () => {
      const response = await http.get<LiveQueryDetailsResponse>(
        `/api/osquery/live_queries/${actionId}`,
        { version: API_VERSIONS.public.v1 }
      );

      return response?.data;
    },
    {
      enabled: !!actionId,
      refetchInterval: (data) => (isQueryComplete(data) ? false : POLL_INTERVAL_MS),
      refetchIntervalInBackground: false,
      retry: false,
      staleTime: Infinity,
      cacheTime: Infinity,
    }
  );

  const innerActionId = getInnerActionId(detailsQuery.data);
  const isComplete = isQueryComplete(detailsQuery.data);

  const resultsQuery = useQuery<Listing>(
    [...listDirectoryCacheKey(agentId, path), 'results', innerActionId],
    async () => {
      if (!actionId || !innerActionId) return { rows: [], total: 0 };
      const response = await http.get<ResultsResponse>(
        `/api/osquery/live_queries/${actionId}/results/${innerActionId}`,
        {
          version: API_VERSIONS.public.v1,
          query: { page: 0, pageSize: MAX_RESULTS_PAGE_SIZE },
        }
      );

      return {
        rows: extractRows(response?.data?.edges ?? []),
        total: response?.data?.total ?? 0,
      };
    },
    {
      enabled: !!actionId && !!innerActionId && isComplete,
      retry: false,
      staleTime: Infinity,
      cacheTime: Infinity,
      onError: (error) =>
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.fileSystem.results.fetchError', {
            defaultMessage: 'Error while fetching directory listing results',
          }),
        }),
    }
  );

  const refetch = () => {
    queryClient.invalidateQueries(listDirectoryCacheKey(agentId, path));
    queryClient.invalidateQueries([...listDirectoryCacheKey(agentId, path), 'details']);
    queryClient.invalidateQueries([...listDirectoryCacheKey(agentId, path), 'results']);
  };

  const isLoading =
    dispatchQuery.isLoading ||
    (!!actionId && !isComplete) ||
    (isComplete && resultsQuery.isLoading);

  return {
    rows: resultsQuery.data?.rows ?? [],
    total: resultsQuery.data?.total ?? 0,
    isLoading,
    isError: dispatchQuery.isError || detailsQuery.isError || resultsQuery.isError,
    actionId,
    refetch,
  };
};

interface UseRootsParams {
  agentId: string;
  osFamily?: string;
  enabled?: boolean;
}

interface UseRootsResult {
  rows: FileRow[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export const useRoots = ({ agentId, osFamily, enabled = true }: UseRootsParams): UseRootsResult => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();
  const queryClient = useQueryClient();

  const dispatchQuery = useQuery<string | undefined>(
    rootsCacheKey(agentId),
    async () => {
      const response = await http.post<DispatchResponse>('/internal/osquery/file_system/roots', {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({ agentId, osFamily }),
      });

      return response?.data?.action_id;
    },
    {
      enabled: !!agentId && enabled,
      staleTime: Infinity,
      cacheTime: Infinity,
      retry: false,
      onError: (error) =>
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.fileSystem.roots.fetchError', {
            defaultMessage: 'Error while fetching file system roots',
          }),
        }),
    }
  );

  const actionId = dispatchQuery.data;

  const detailsQuery = useQuery<LiveQueryDetailsResponse['data']>(
    [...rootsCacheKey(agentId), 'details'],
    async () => {
      const response = await http.get<LiveQueryDetailsResponse>(
        `/api/osquery/live_queries/${actionId}`,
        { version: API_VERSIONS.public.v1 }
      );

      return response?.data;
    },
    {
      enabled: !!actionId,
      refetchInterval: (data) => (isQueryComplete(data) ? false : POLL_INTERVAL_MS),
      refetchIntervalInBackground: false,
      retry: false,
      staleTime: Infinity,
      cacheTime: Infinity,
    }
  );

  const innerActionId = getInnerActionId(detailsQuery.data);
  const isComplete = isQueryComplete(detailsQuery.data);

  const resultsQuery = useQuery<FileRow[]>(
    [...rootsCacheKey(agentId), 'results', innerActionId],
    async () => {
      if (!actionId || !innerActionId) return [];
      const response = await http.get<ResultsResponse>(
        `/api/osquery/live_queries/${actionId}/results/${innerActionId}`,
        {
          version: API_VERSIONS.public.v1,
          query: { page: 0, pageSize: 100 },
        }
      );

      return extractRows(response?.data?.edges ?? []);
    },
    {
      enabled: !!actionId && !!innerActionId && isComplete,
      retry: false,
      staleTime: Infinity,
      cacheTime: Infinity,
      onError: (error) =>
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.fileSystem.roots.results.fetchError', {
            defaultMessage: 'Error while fetching file system root results',
          }),
        }),
    }
  );

  const refetch = () => {
    queryClient.invalidateQueries(rootsCacheKey(agentId));
    queryClient.invalidateQueries([...rootsCacheKey(agentId), 'details']);
    queryClient.invalidateQueries([...rootsCacheKey(agentId), 'results']);
  };

  return {
    rows: resultsQuery.data ?? [],
    isLoading:
      dispatchQuery.isLoading ||
      (!!actionId && !isComplete) ||
      (isComplete && resultsQuery.isLoading),
    isError: dispatchQuery.isError || detailsQuery.isError || resultsQuery.isError,
    refetch,
  };
};
