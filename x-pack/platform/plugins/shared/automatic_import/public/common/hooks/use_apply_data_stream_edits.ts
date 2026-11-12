/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { ApplyDataStreamEditsResponse } from '../../../common';
import type { ApplyDataStreamEditsRequest } from '../lib/api';
import { applyDataStreamEdits } from '../lib/api';
import { useKibana } from './use_kibana';
import * as i18n from './translations';

interface HttpErrorLike {
  message?: string;
  body?: {
    message?: string;
    status_code?: number;
  };
  response?: {
    status?: number;
  };
}

/** An edits request error that keeps the HTTP status code of the response. */
export class DataStreamEditsError extends Error {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'DataStreamEditsError';
    this.statusCode = statusCode;
  }
}

/** Whether a save was rejected because the data stream changed after the draft was opened. */
export const isDataStreamEditsConflict = (error: unknown): boolean =>
  error instanceof DataStreamEditsError && error.statusCode === 409;

const toDataStreamEditsError = (error: unknown): DataStreamEditsError => {
  const errorLike = error as HttpErrorLike;
  return new DataStreamEditsError(
    errorLike.body?.message ?? errorLike.message ?? i18n.SAVE_EDITS_ERROR,
    errorLike.response?.status ?? errorLike.body?.status_code
  );
};

export interface UseApplyDataStreamEditsResult {
  applyDataStreamEditsMutation: ReturnType<
    typeof useMutation<ApplyDataStreamEditsResponse, Error, ApplyDataStreamEditsRequest>
  >;
}

/**
 * Previews (`dryRun`) or saves pipeline and field type edits. A `failure` response means nothing
 * was saved; only saves show toasts.
 */
export function useApplyDataStreamEdits(): UseApplyDataStreamEditsResult {
  const { http, notifications } = useKibana().services;
  const queryClient = useQueryClient();

  const mutation = useMutation<ApplyDataStreamEditsResponse, Error, ApplyDataStreamEditsRequest>({
    mutationFn: async (request: ApplyDataStreamEditsRequest) => {
      try {
        return await applyDataStreamEdits({ http, ...request });
      } catch (error) {
        throw toDataStreamEditsError(error);
      }
    },
    onSuccess: (data, variables) => {
      if (data.status !== 'saved') return;
      queryClient.invalidateQueries({
        queryKey: ['dataStreamResults', variables.integrationId, variables.dataStreamId],
      });
      queryClient.invalidateQueries({
        queryKey: ['integration', variables.integrationId],
      });
      notifications.toasts.addSuccess({ title: i18n.SAVE_EDITS_SUCCESS });
    },
    onError: (error, variables) => {
      if (variables.dryRun) return;
      queryClient.invalidateQueries({ queryKey: ['integration', variables.integrationId] });
      if (isDataStreamEditsConflict(error)) {
        queryClient.invalidateQueries({
          queryKey: ['dataStreamResults', variables.integrationId, variables.dataStreamId],
        });
      }
      notifications.toasts.addDanger({
        title: i18n.SAVE_EDITS_ERROR,
        text: error.message,
      });
    },
  });

  return { applyDataStreamEditsMutation: mutation };
}
