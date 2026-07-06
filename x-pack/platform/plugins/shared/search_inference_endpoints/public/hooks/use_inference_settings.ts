/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { InferenceSettingsAttributes, InferenceSettingsResponse } from '../../common/types';
import { APIRoutes } from '../../common/types';
import { INFERENCE_SETTINGS_QUERY_KEY, ROUTE_VERSIONS } from '../../common/constants';
import { useKibana } from './use_kibana';

export const useInferenceSettings = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: [INFERENCE_SETTINGS_QUERY_KEY],
    queryFn: async () => {
      return services.http.get<InferenceSettingsResponse>(APIRoutes.GET_INFERENCE_SETTINGS, {
        version: ROUTE_VERSIONS.v1,
      });
    },
  });
};

export const useSaveInferenceSettings = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: InferenceSettingsAttributes) => {
      return services.http.put<InferenceSettingsResponse>(APIRoutes.PUT_INFERENCE_SETTINGS, {
        body: JSON.stringify(body),
        version: ROUTE_VERSIONS.v1,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData([INFERENCE_SETTINGS_QUERY_KEY], data);
      services.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.searchInferenceEndpoints.settings.saveSuccess', {
          defaultMessage: 'Changes saved',
        }),
      });
    },
    onError: () => {
      services.notifications.toasts.addDanger({
        title: i18n.translate('xpack.searchInferenceEndpoints.settings.saveError', {
          defaultMessage: 'Failed to save settings',
        }),
      });
    },
  });
};
