/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { UpdateDataStreamFieldTypesResponse } from '../../../common';
import type { UpdateDataStreamFieldTypesRequest } from '../lib/api';
import { updateDataStreamFieldTypes } from '../lib/api';
import { useKibana } from './use_kibana';
import * as i18n from './translations';

interface HttpErrorLike {
  message?: string;
  body?: {
    message?: string;
  };
}

const getFieldTypesSaveErrorMessage = (error: unknown): string => {
  const errorLike = error as HttpErrorLike;
  return errorLike.body?.message ?? errorLike.message ?? i18n.SAVE_FIELD_TYPES_ERROR;
};

export interface UseUpdateDataStreamFieldTypesResult {
  updateDataStreamFieldTypesMutation: ReturnType<
    typeof useMutation<UpdateDataStreamFieldTypesResponse, Error, UpdateDataStreamFieldTypesRequest>
  >;
}

/** Saves field type edits. A `failure` response means nothing was saved. */
export function useUpdateDataStreamFieldTypes(): UseUpdateDataStreamFieldTypesResult {
  const { http, notifications } = useKibana().services;
  const queryClient = useQueryClient();

  const mutation = useMutation<
    UpdateDataStreamFieldTypesResponse,
    Error,
    UpdateDataStreamFieldTypesRequest
  >({
    mutationFn: async (request: UpdateDataStreamFieldTypesRequest) => {
      try {
        return await updateDataStreamFieldTypes({ http, ...request });
      } catch (error) {
        throw new Error(getFieldTypesSaveErrorMessage(error));
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
      notifications.toasts.addSuccess({ title: i18n.SAVE_FIELD_TYPES_SUCCESS });
    },
    onError: (error) => {
      notifications.toasts.addDanger({
        title: i18n.SAVE_FIELD_TYPES_ERROR,
        text: getFieldTypesSaveErrorMessage(error),
      });
    },
  });

  return { updateDataStreamFieldTypesMutation: mutation };
}
