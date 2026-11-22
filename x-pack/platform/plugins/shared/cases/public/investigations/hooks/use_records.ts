/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  CloseRecordRequest,
  CreateRecordRequest,
  CreateRecordResponse,
  CreateThreadRequest,
  DuplicateCheckRequest,
  FindRecordsRequest,
  MergeRecordRequest,
  UpdateRecordRequest,
} from '../../../common/investigations/types';
import {
  checkDuplicates,
  closeRecord,
  createRecord,
  createThread,
  findRecords,
  getRecord,
  getRelatedRecords,
  getSinceLastHandoff,
  getTimings,
  reopenRecord,
  mergeRecord,
  updateRecord,
} from '../api/client';
import { investigationKeys } from '../api/query_keys';
import { useInvestigationsServices } from '../services';
import { useInvestigationToasts } from './use_investigation_toasts';
import * as i18n from './translations';

/** Server-side paged, sorted and filtered list of records (the queue). */
export const useFindRecords = (request: FindRecordsRequest) => {
  const { http } = useInvestigationsServices();

  return useQuery(investigationKeys.find(request), () => findRecords(http, request), {
    keepPreviousData: true,
    retry: false,
  });
};

/** One record with the fresh case fields and whether the agent is available. */
export const useRecord = (recordId: string) => {
  const { http } = useInvestigationsServices();

  return useQuery(investigationKeys.record(recordId), () => getRecord(http, recordId), {
    enabled: recordId.length > 0,
    retry: false,
  });
};

export const useRelated = (recordId: string) => {
  const { http } = useInvestigationsServices();

  return useQuery(investigationKeys.related(recordId), () => getRelatedRecords(http, recordId), {
    enabled: recordId.length > 0,
    retry: false,
  });
};

/** What changed since the last handoff. Pass the handoff time as `since`. */
export const useSinceLastHandoff = (recordId: string, since: string | undefined) => {
  const { http } = useInvestigationsServices();

  return useQuery(
    investigationKeys.since(recordId, since),
    () => getSinceLastHandoff(http, recordId, since),
    { enabled: recordId.length > 0, retry: false }
  );
};

/** Calls `_duplicates` when there is something to check. */
export const useDuplicateCheck = (request: DuplicateCheckRequest, enabled: boolean = true) => {
  const { http } = useInvestigationsServices();
  const hasInput =
    (request.entity_names?.length ?? 0) > 0 ||
    (request.alert_ids?.length ?? 0) > 0 ||
    (request.indicator_values?.length ?? 0) > 0;

  return useQuery(investigationKeys.duplicates(request), () => checkDuplicates(http, request), {
    enabled: enabled && hasInput,
    retry: false,
    staleTime: 10000,
  });
};

export const useCreateRecord = (options?: {
  onSuccess?: (response: CreateRecordResponse) => void;
  /** The caller shows the error itself (next to a form field), so no toast. */
  silentErrors?: boolean;
}) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useInvestigationToasts();

  return useMutation((body: CreateRecordRequest) => createRecord(http, body), {
    onSuccess: (response) => {
      showSuccess(i18n.CREATE_RECORD_SUCCESS(response.record.display_id));
      void queryClient.invalidateQueries(investigationKeys.findAll());
      options?.onSuccess?.(response);
    },
    onError: (error) => {
      if (!options?.silentErrors) showError(error, i18n.CREATE_RECORD_ERROR);
    },
  });
};

export const useUpdateRecord = (
  recordId: string,
  options?: {
    successMessage?: string;
    /** The caller shows the error itself (next to a form field), so no toast. */
    silentErrors?: boolean;
  }
) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useInvestigationToasts();

  return useMutation((body: UpdateRecordRequest) => updateRecord(http, recordId, body), {
    onSuccess: () => {
      if (options?.successMessage) {
        showSuccess(options.successMessage);
      }
      void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
      void queryClient.invalidateQueries(investigationKeys.findAll());
    },
    onError: (error) => {
      if (!options?.silentErrors) showError(error, i18n.UPDATE_RECORD_ERROR);
    },
  });
};

export const useCloseRecord = (recordId: string, options?: { silentErrors?: boolean }) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useInvestigationToasts();

  return useMutation((body: CloseRecordRequest) => closeRecord(http, recordId, body), {
    onSuccess: () => {
      showSuccess(i18n.CLOSE_RECORD_SUCCESS);
      void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
      void queryClient.invalidateQueries(investigationKeys.findAll());
    },
    onError: (error) => {
      if (!options?.silentErrors) showError(error, i18n.CLOSE_RECORD_ERROR);
    },
  });
};

export const useReopenRecord = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useInvestigationToasts();

  return useMutation(() => reopenRecord(http, recordId), {
    onSuccess: () => {
      showSuccess(i18n.REOPEN_RECORD_SUCCESS);
      void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
      void queryClient.invalidateQueries(investigationKeys.findAll());
    },
    onError: (error) => showError(error, i18n.REOPEN_RECORD_ERROR),
  });
};

export const useMergeRecord = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useInvestigationToasts();

  return useMutation((body: MergeRecordRequest) => mergeRecord(http, recordId, body), {
    onSuccess: () => {
      showSuccess(i18n.MERGE_RECORD_SUCCESS);
      void queryClient.invalidateQueries(investigationKeys.all);
    },
    onError: (error) => showError(error, i18n.MERGE_RECORD_ERROR),
  });
};

export const useCreateThread = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError } = useInvestigationToasts();

  return useMutation((body: CreateThreadRequest) => createThread(http, recordId, body), {
    onSuccess: () => {
      void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
    },
    onError: (error) => showError(error, i18n.CREATE_THREAD_ERROR),
  });
};

/** Time to first response, time in progress and time to close (Cases metrics, less paused time). */
export const useTimings = (recordId: string) => {
  const { http } = useInvestigationsServices();

  return useQuery(
    [...investigationKeys.recordScope(recordId), 'timings'],
    () => getTimings(http, recordId),
    { enabled: recordId.length > 0, retry: false }
  );
};
