/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';

import { INFERENCE_ENDPOINTS_QUERY_KEY } from '../../common/constants';

interface MutationArgs {
  type: string;
  id: string;
}

export const useDeleteEndpoint = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { services } = useKibana();
  const toasts = services.notifications?.toasts;

  return useMutation(
    async ({ type, id }: MutationArgs) => {
      return await services.http.delete<{}>(`/internal/inference_endpoint/endpoints/${type}/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([INFERENCE_ENDPOINTS_QUERY_KEY]);
        toasts?.addSuccess({
          title: i18n.translate('xpack.searchInferenceEndpoints.deleteEndpoint.deleteSuccess', {
            defaultMessage: 'The inference endpoint has been deleted sucessfully.',
          }),
        });
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: { body: KibanaServerError }) => {
        toasts?.addError(new Error(error.body.message), {
          title: i18n.translate(
            'xpack.searchInferenceEndpoints.deleteEndpoint.endpointDeletionFailed',
            {
              defaultMessage: 'Endpoint deletion failed',
            }
          ),
          toastMessage: error.body.message,
        });
      },
    }
  );
};
