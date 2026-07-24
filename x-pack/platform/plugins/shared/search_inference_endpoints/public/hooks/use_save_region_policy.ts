/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { RegionPolicyBody, RegionPolicyResponse } from '../../common/types';
import { APIRoutes } from '../../common/types';
import { REGION_POLICY_QUERY_KEY, ROUTE_VERSIONS } from '../../common/constants';
import { useKibana } from './use_kibana';

export const useSaveRegionPolicy = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<RegionPolicyResponse, IHttpFetchError<ResponseErrorBody>, RegionPolicyBody>({
    mutationFn: async (body: RegionPolicyBody) => {
      return services.http.put<RegionPolicyResponse>(APIRoutes.REGION_POLICY, {
        body: JSON.stringify(body),
        version: ROUTE_VERSIONS.v1,
      });
    },
    onSuccess: () => {
      services.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.searchInferenceEndpoints.regionPolicy.saveSuccess', {
          defaultMessage: 'Region preferences saved',
        }),
      });
    },
    onError: (err) => {
      if (err.response?.status === 409) {
        services.notifications.toasts.addDanger({
          title: i18n.translate('xpack.searchInferenceEndpoints.regionPolicy.conflictError', {
            defaultMessage: 'Region policy update blocked',
          }),
          ...(err.body?.message ? { text: err.body.message } : {}),
        });
      } else {
        services.notifications.toasts.addError(err, {
          title: i18n.translate('xpack.searchInferenceEndpoints.regionPolicy.saveError', {
            defaultMessage: 'Failed to save region preferences',
          }),
        });
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: [REGION_POLICY_QUERY_KEY] });
    },
  });
};
