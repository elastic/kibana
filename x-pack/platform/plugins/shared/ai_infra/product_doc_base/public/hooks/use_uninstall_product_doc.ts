/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { UninstallResponse } from '../../common/http_api/installation';
import type { ProductDocBasePluginStart } from '../types';
import { REACT_QUERY_KEYS } from './constants';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export interface UseUninstallProductDocOptions {
  /** Callback fired on successful uninstallation */
  onSuccess?: () => void;
  /** Callback fired on uninstallation error */
  onError?: (error: ServerError) => void;
}

/**
 * Hook to uninstall product documentation.
 * Automatically invalidates the status query on success.
 */
export function useUninstallProductDoc(
  productDocBase: ProductDocBasePluginStart,
  options: UseUninstallProductDocOptions = {}
) {
  const { onSuccess, onError } = options;
  const queryClient = useQueryClient();

  return useMutation<UninstallResponse, ServerError, string | undefined>(
    [REACT_QUERY_KEYS.UNINSTALL_PRODUCT_DOC],
    async (inferenceId?: string) => {
      return productDocBase.installation.uninstall({
        inferenceId: inferenceId || defaultInferenceEndpoints.ELSER,
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
