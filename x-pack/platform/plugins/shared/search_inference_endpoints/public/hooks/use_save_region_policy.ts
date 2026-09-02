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
import {
  INFERENCE_ENDPOINTS_QUERY_KEY,
  REGION_POLICY_QUERY_KEY,
  ROUTE_VERSIONS,
} from '../../common/constants';
import { parseRegionPolicyConflict } from '../utils/parse_region_policy_conflict';
import { useKibana } from './use_kibana';
import { useRegionPreferencesRedesignEnabled } from './use_region_preferences_redesign_enabled';

export interface SaveRegionPolicyVariables {
  body: RegionPolicyBody;
  force?: boolean;
}

export const useSaveRegionPolicy = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();
  const isRedesignEnabled = useRegionPreferencesRedesignEnabled();

  return useMutation<
    RegionPolicyResponse,
    IHttpFetchError<ResponseErrorBody>,
    SaveRegionPolicyVariables
  >({
    mutationFn: async ({ body, force }: SaveRegionPolicyVariables) => {
      return services.http.put<RegionPolicyResponse>(APIRoutes.REGION_POLICY, {
        body: JSON.stringify(body),
        version: ROUTE_VERSIONS.v1,
        ...(force ? { query: { force: true } } : {}),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData([REGION_POLICY_QUERY_KEY], data);
      queryClient.invalidateQueries([INFERENCE_ENDPOINTS_QUERY_KEY]);
      services.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.searchInferenceEndpoints.regionPolicy.saveSuccess', {
          defaultMessage: 'Region preferences saved',
        }),
      });
    },
    onError: (err) => {
      const isConflict = err.response?.status === 409;
      const conflictArtifacts = parseRegionPolicyConflict(err.body?.attributes);
      const isInUseConflict = isConflict && Boolean(conflictArtifacts);
      const surfaceConflictInModal = isRedesignEnabled && isInUseConflict;
      if (surfaceConflictInModal) {
        return;
      }
      if (isConflict) {
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
  });
};
