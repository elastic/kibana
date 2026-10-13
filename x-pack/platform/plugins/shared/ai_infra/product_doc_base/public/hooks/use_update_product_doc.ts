/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { PerformUpdateResponse } from '../../common/http_api/installation';
import type { ProductDocBasePluginStart } from '../types';
import { REACT_QUERY_KEYS } from './constants';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export interface UseUpdateProductDocOptions {
  /** Callback fired on successful update */
  onSuccess?: () => void;
  /** Callback fired on update error */
  onError?: (error: ServerError) => void;
}

/**
 * Hook to force-update product documentation for a specific inference ID.
 * Automatically invalidates the status query on success.
 */
export function useUpdateProductDoc(
  productDocBase: ProductDocBasePluginStart,
  options: UseUpdateProductDocOptions = {}
) {
  const { onSuccess, onError } = options;
  const queryClient = useQueryClient();

  type UpdateVars = string | { inferenceId?: string } | undefined;

  return useMutation<PerformUpdateResponse, ServerError, UpdateVars>(
    [REACT_QUERY_KEYS.UPDATE_PRODUCT_DOC],
    async (vars) => {
      const inferenceId =
        typeof vars === 'string' ? vars : vars?.inferenceId ?? defaultInferenceEndpoints.ELSER;
      return productDocBase.installation.updateAll({
        forceUpdate: true,
        inferenceIds: [inferenceId],
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [REACT_QUERY_KEYS.GET_PRODUCT_DOC_STATUS],
          refetchType: 'all',
        });
        onSuccess?.();
      },
      onError,
    }
  );
}
