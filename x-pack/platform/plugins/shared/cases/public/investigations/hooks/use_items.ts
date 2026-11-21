/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  BulkCreateItemsRequest,
  BulkDeleteItemsRequest,
  BulkUpdateItemsRequest,
  FindItemsRequest,
  ImportIndicatorsRequest,
  UpdateItemRequest,
} from '../../../common/investigations/types';
import {
  bulkCreateItems,
  bulkDeleteItems,
  bulkUpdateItems,
  findItems,
  getItem,
  importIndicators,
  preserveEvidence,
  updateItem,
  uploadFile,
} from '../api/client';
import { investigationKeys } from '../api/query_keys';
import { useInvestigationsServices } from '../services';
import { getHttpErrorStatus } from './errors';
import { useInvestigationToasts } from './use_investigation_toasts';
import * as i18n from './translations';

/** Items of a record (evidence, claims, entities, tasks...) filtered, sorted and paged. */
export const useItems = (
  recordId: string,
  request: FindItemsRequest,
  options?: { enabled?: boolean }
) => {
  const { http } = useInvestigationsServices();

  return useQuery(
    investigationKeys.items(recordId, request),
    () => findItems(http, recordId, request),
    {
      enabled: (options?.enabled ?? true) && recordId.length > 0,
      keepPreviousData: true,
      retry: false,
    }
  );
};

export const useItem = (recordId: string, itemId: string | undefined) => {
  const { http } = useInvestigationsServices();

  return useQuery(
    [...investigationKeys.itemsAll(recordId), 'item', itemId],
    () => getItem(http, recordId, itemId ?? ''),
    { enabled: recordId.length > 0 && Boolean(itemId), retry: false }
  );
};

/**
 * Items change counters on the record, so every item mutation refreshes the whole record scope
 * (record, items, activity, related) and the queue.
 */
const useInvalidateRecord = (recordId: string) => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
    void queryClient.invalidateQueries(investigationKeys.findAll());
  };
};

export const useBulkCreateItems = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidateRecord(recordId);
  const { showError } = useInvestigationToasts();

  return useMutation((body: BulkCreateItemsRequest) => bulkCreateItems(http, recordId, body), {
    onSuccess: invalidate,
    onError: (error) => showError(error, i18n.ITEMS_ERROR),
  });
};

export type UpdateItemVariables = UpdateItemRequest & { itemId: string };

/** Fails with HTTP 409 when the item changed since `version` was read. */
export const useUpdateItem = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidateRecord(recordId);
  const { showError } = useInvestigationToasts();

  return useMutation(
    ({ itemId, ...body }: UpdateItemVariables) => updateItem(http, recordId, itemId, body),
    {
      onSuccess: invalidate,
      onError: (error) => {
        showError(
          error,
          getHttpErrorStatus(error) === 409 ? i18n.ITEM_CONFLICT_ERROR : i18n.ITEMS_ERROR
        );
        invalidate();
      },
    }
  );
};

export const useBulkUpdateItems = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidateRecord(recordId);
  const { showError } = useInvestigationToasts();

  return useMutation((body: BulkUpdateItemsRequest) => bulkUpdateItems(http, recordId, body), {
    onSuccess: invalidate,
    onError: (error) => showError(error, i18n.ITEMS_ERROR),
  });
};

export const useBulkDeleteItems = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidateRecord(recordId);
  const { showError } = useInvestigationToasts();

  return useMutation((body: BulkDeleteItemsRequest) => bulkDeleteItems(http, recordId, body), {
    onSuccess: invalidate,
    onError: (error) => showError(error, i18n.DELETE_ITEMS_ERROR),
  });
};

export const useImportIndicators = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidateRecord(recordId);
  const { showError } = useInvestigationToasts();

  return useMutation((body: ImportIndicatorsRequest) => importIndicators(http, recordId, body), {
    onSuccess: invalidate,
    onError: (error) => showError(error, i18n.IMPORT_INDICATORS_ERROR),
  });
};

export const usePreserveEvidence = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidateRecord(recordId);
  const { showError } = useInvestigationToasts();

  return useMutation((body: { ids: string[] }) => preserveEvidence(http, recordId, body), {
    onSuccess: invalidate,
    onError: (error) => showError(error, i18n.PRESERVE_EVIDENCE_ERROR),
  });
};

export const useUploadFile = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidateRecord(recordId);
  const { showError } = useInvestigationToasts();

  return useMutation(
    (variables: { file: File | Blob; filename?: string; why?: string }) =>
      uploadFile(http, recordId, variables),
    {
      onSuccess: invalidate,
      onError: (error) => showError(error, i18n.UPLOAD_FILE_ERROR),
    }
  );
};
