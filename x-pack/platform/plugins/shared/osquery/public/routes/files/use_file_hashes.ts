/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../common/lib/kibana';
import { API_VERSIONS } from '../../../common/constants';
import { useErrorToast } from '../../common/hooks/use_error_toast';

export interface FileHashes {
  path: string;
  md5: string;
  sha1: string;
  sha256: string;
}

interface HashRow {
  fields: Record<string, string[]>;
}

interface HashDispatchResponse {
  data: { action_id: string };
}

interface HashResultsResponse {
  data: {
    total: number;
    edges: HashRow[];
  };
}

const extractHashes = (edges: HashRow[]): FileHashes | undefined => {
  const edge = edges[0];
  if (!edge) return undefined;

  const f = edge.fields;

  return {
    path: f['osquery.path']?.[0] ?? f.path?.[0] ?? '',
    md5: f['osquery.md5']?.[0] ?? f.md5?.[0] ?? '',
    sha1: f['osquery.sha1']?.[0] ?? f.sha1?.[0] ?? '',
    sha256: f['osquery.sha256']?.[0] ?? f.sha256?.[0] ?? '',
  };
};

const POLL_INTERVAL_MS = 2000;

interface UseFileHashesParams {
  agentId: string;
  path: string;
  enabled?: boolean;
}

interface UseFileHashesResult {
  hashes: FileHashes | undefined;
  isLoading: boolean;
  isError: boolean;
}

export const useFileHashes = ({
  agentId,
  path,
  enabled = true,
}: UseFileHashesParams): UseFileHashesResult => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  const dispatchQuery = useQuery<string | undefined>(
    ['osquery', 'fileSystem', 'hashes', agentId, path],
    async () => {
      const resp = await http.post<HashDispatchResponse>('/internal/osquery/file_system/hashes', {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({ agentId, path }),
      });

      return resp?.data?.action_id;
    },
    {
      enabled: !!agentId && !!path && enabled,
      staleTime: Infinity,
      cacheTime: Infinity,
      retry: false,
      onError: (error) =>
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.fileSystem.hashes.fetchError', {
            defaultMessage: 'Error while computing file hashes',
          }),
        }),
    }
  );

  const actionId = dispatchQuery.data;

  const resultsQuery = useQuery<FileHashes | undefined>(
    ['osquery', 'fileSystem', 'hashes', agentId, path, 'results'],
    async () => {
      if (!actionId) return undefined;
      const resp = await http.get<HashResultsResponse>(
        `/api/osquery/live_queries/${actionId}/results/${actionId}`,
        {
          version: API_VERSIONS.public.v1,
          query: { page: 0, pageSize: 1 },
        }
      );

      return extractHashes(resp?.data?.edges ?? []);
    },
    {
      enabled: !!actionId,
      refetchInterval: (data) => {
        if (data) return false;

        return POLL_INTERVAL_MS;
      },
      refetchIntervalInBackground: false,
      retry: false,
      staleTime: Infinity,
      cacheTime: Infinity,
      onError: (error) =>
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.fileSystem.hashes.resultsError', {
            defaultMessage: 'Error while fetching file hash results',
          }),
        }),
    }
  );

  const isLoading =
    dispatchQuery.isLoading ||
    (!!actionId && resultsQuery.isLoading) ||
    (!!actionId && resultsQuery.isFetching && !resultsQuery.data);

  return {
    hashes: resultsQuery.data,
    isLoading,
    isError: dispatchQuery.isError || resultsQuery.isError,
  };
};
