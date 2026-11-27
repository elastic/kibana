/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  CreateActivityRequest,
  FindActivityRequest,
} from '../../../common/investigations/types';
import { createActivity, findActivity } from '../api/client';
import { investigationKeys } from '../api/query_keys';
import { useInvestigationsServices } from '../services';
import { getHttpErrorStatus } from './errors';
import { useInvestigationToasts } from './use_investigation_toasts';
import * as i18n from './translations';

export const LIVE_POLL_INTERVAL_MS = 4000;

export const useActivity = (
  recordId: string,
  request: FindActivityRequest,
  options?: { enabled?: boolean }
) => {
  const { http } = useInvestigationsServices();

  return useQuery(
    investigationKeys.activity(recordId, request),
    () => findActivity(http, recordId, request),
    {
      enabled: (options?.enabled ?? true) && recordId.length > 0,
      keepPreviousData: true,
      retry: false,
    }
  );
};

export const useCreateActivity = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError } = useInvestigationToasts();

  return useMutation((body: CreateActivityRequest) => createActivity(http, recordId, body), {
    onSuccess: () => {
      void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
    },
    onError: (error) => showError(error, i18n.CREATE_ACTIVITY_ERROR),
  });
};

/**
 * Polls the activity feed every 4 seconds while the detail page is open. When entries newer than
 * the latest seen timestamp arrive, the record, items and activity queries of that record are
 * invalidated so people see what agents and teammates just did.
 */
export const useLivePolling = (recordId: string): void => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const latestTsRef = useRef<string | null>(null);

  useEffect(() => {
    latestTsRef.current = null;
  }, [recordId]);

  useQuery(
    investigationKeys.livePoll(recordId),
    () => {
      const since = latestTsRef.current;
      if (since === null) {
        return findActivity(http, recordId, { per_page: 1 }).then(({ latest_ts: latestTs }) => {
          latestTsRef.current = latestTs ?? '';
          return latestTs;
        });
      }

      return findActivity(http, recordId, {
        ...(since.length > 0 ? { since } : {}),
        per_page: 1,
      }).then((response) => {
        if (response.entries.length > 0 || response.total > 0) {
          latestTsRef.current = response.latest_ts ?? since;
          void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
        }
        return response.latest_ts;
      });
    },
    {
      enabled: recordId.length > 0,
      // A 404 means the record was deleted (here, in classic Cases or by another user): stop
      // polling and refresh the record once so the page shows "not found" instead of a dead view.
      refetchInterval: (_data, query) =>
        getHttpErrorStatus(query.state.error) === 404 ? false : LIVE_POLL_INTERVAL_MS,
      refetchIntervalInBackground: false,
      retry: false,
      cacheTime: 0,
      onError: (error) => {
        if (getHttpErrorStatus(error) === 404) {
          void queryClient.invalidateQueries(investigationKeys.record(recordId));
        }
      },
    }
  );
};
