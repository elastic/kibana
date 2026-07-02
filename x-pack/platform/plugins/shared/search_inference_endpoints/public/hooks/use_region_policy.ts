/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { RegionPolicyBody, RegionPolicyResponse } from '../../common/types';
import { APIRoutes } from '../../common/types';
import { REGION_POLICY_QUERY_KEY, ROUTE_VERSIONS } from '../../common/constants';
import { useKibana } from './use_kibana';

export const useRegionPolicy = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: [REGION_POLICY_QUERY_KEY],
    queryFn: async () => {
      try {
        return await services.http.get<RegionPolicyResponse>(APIRoutes.REGION_POLICY, {
          version: ROUTE_VERSIONS.v1,
        });
      } catch (err) {
        // 404 means no policy has been set yet — treat as empty policy
        if (err?.response?.status === 404 || err?.body?.statusCode === 404) {
          return null;
        }
        throw err;
      }
    },
  });
};

export const useSaveRegionPolicy = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: RegionPolicyBody) => {
      return services.http.put<RegionPolicyResponse>(APIRoutes.REGION_POLICY, {
        body: JSON.stringify(body),
        version: ROUTE_VERSIONS.v1,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData([REGION_POLICY_QUERY_KEY], data);
      services.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.searchInferenceEndpoints.regionPolicy.saveSuccess', {
          defaultMessage: 'Region preferences saved',
        }),
      });
    },
    onError: () => {
      services.notifications.toasts.addDanger({
        title: i18n.translate('xpack.searchInferenceEndpoints.regionPolicy.saveError', {
          defaultMessage: 'Failed to save region preferences',
        }),
      });
    },
  });
};

export const useDeleteRegionPolicy = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return services.http.delete(APIRoutes.REGION_POLICY, {
        version: ROUTE_VERSIONS.v1,
      });
    },
    onSuccess: () => {
      queryClient.setQueryData([REGION_POLICY_QUERY_KEY], null);
      services.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.searchInferenceEndpoints.regionPolicy.deleteSuccess', {
          defaultMessage: 'Region restrictions removed',
        }),
      });
    },
    onError: () => {
      services.notifications.toasts.addDanger({
        title: i18n.translate('xpack.searchInferenceEndpoints.regionPolicy.deleteError', {
          defaultMessage: 'Failed to remove region restrictions',
        }),
      });
    },
  });
};
