/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { APIRoutes } from '../../common/types';
import { REGION_POLICY_QUERY_KEY, ROUTE_VERSIONS } from '../../common/constants';
import { useKibana } from './use_kibana';

export const useDeleteRegionPolicy = (onSuccess?: () => void) => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<{ acknowledged: boolean }, IHttpFetchError<ResponseErrorBody>, void>({
    mutationFn: async () => {
      return services.http.delete<{ acknowledged: boolean }>(APIRoutes.REGION_POLICY, {
        version: ROUTE_VERSIONS.v1,
      });
    },
    onSuccess: () => {
      queryClient.setQueryData([REGION_POLICY_QUERY_KEY], null);
      services.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.searchInferenceEndpoints.regionPolicy.deleteSuccess', {
          defaultMessage: 'Region preferences reset to default',
        }),
      });
      onSuccess?.();
    },
    onError: (err) => {
      if (err.response?.status === 409) {
        services.notifications.toasts.addDanger({
          title: i18n.translate('xpack.searchInferenceEndpoints.regionPolicy.deleteConflictError', {
            defaultMessage: "Can't reset region preferences",
          }),
          ...(err.body?.message ? { text: err.body.message } : {}),
        });
      } else {
        services.notifications.toasts.addError(err, {
          title: i18n.translate('xpack.searchInferenceEndpoints.regionPolicy.deleteError', {
            defaultMessage: 'Failed to reset region preferences',
          }),
        });
      }
    },
  });
};
