/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import {
  REACT_QUERY_KEYS,
  type ProductDocBasePluginStart,
} from '@kbn/product-doc-base-plugin/public';
import { useMutation, useQueryClient } from '@kbn/react-query';

type ServerError = IHttpFetchError<ResponseErrorBody>;

type PerformUpdateResponse = Awaited<
  ReturnType<ProductDocBasePluginStart['installation']['updateAll']>
>;

const UPDATE_PRODUCT_DOC_MUTATION_KEY = 'productDocBase.update';

export interface UseUpdateProductDocOptions {
  /** Callback fired on successful update */
  onSuccess?: () => void;
  /** Callback fired on update error */
  onError?: (error: ServerError) => void;
}

/** Force-updates product documentation for one inference endpoint without adding it to the productDocBase page-load bundle. */
export function useUpdateProductDoc(
  productDocBase: ProductDocBasePluginStart,
  options: UseUpdateProductDocOptions = {}
) {
  const { onSuccess, onError } = options;
  const queryClient = useQueryClient();

  type UpdateVars = string | { inferenceId?: string } | undefined;

  return useMutation<PerformUpdateResponse, ServerError, UpdateVars>(
    [UPDATE_PRODUCT_DOC_MUTATION_KEY],
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
        queryClient.invalidateQueries({
          queryKey: [REACT_QUERY_KEYS.GET_PRODUCT_DOC_UPDATE_AVAILABILITY],
          refetchType: 'all',
        });
        onSuccess?.();
      },
      onError,
    }
  );
}
