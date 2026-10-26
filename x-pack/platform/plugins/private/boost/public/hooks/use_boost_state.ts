/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart, IHttpFetchError } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import {
  BOOST_DEFAULT_RULES_API_PATH,
  BOOST_EXPLAIN_API_PATH,
  BOOST_PROFILES_API_PATH,
  BOOST_RULES_API_PATH,
  BOOST_STATE_API_PATH,
} from '../../common/constants';
import type {
  BoostExplanation,
  BoostProfileInput,
  BoostProfileType,
  BoostRuleInput,
  BoostState,
} from '../../common/types';
import { useBoostServices } from './use_boost_services';

const BOOST_STATE_QUERY_KEY = ['boost', 'state'] as const;
const BOOST_EXPLAIN_QUERY_KEY = ['boost', 'explain'] as const;

export const useBoostState = () => {
  const { http } = useBoostServices();

  return useQuery<BoostState, IHttpFetchError>({
    queryKey: BOOST_STATE_QUERY_KEY,
    queryFn: ({ signal }) => http.get<BoostState>(BOOST_STATE_API_PATH, { signal }),
  });
};

/** How boost rules apply to one index or data stream, such as for its details in Index Management. */
export const useBoostExplanation = (name: string) => {
  const { http } = useBoostServices();

  return useQuery<BoostExplanation, IHttpFetchError>({
    queryKey: [...BOOST_EXPLAIN_QUERY_KEY, name],
    queryFn: ({ signal }) =>
      http.get<BoostExplanation>(`${BOOST_EXPLAIN_API_PATH}/${encodeURIComponent(name)}`, {
        signal,
      }),
  });
};

/** Refetches the state, such as after something outside boost changes the data sources. */
export const useRefetchBoostState = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: BOOST_STATE_QUERY_KEY });
};

/** Mutations respond with the full updated state, which replaces the cached state. */
const useBoostMutation = <TVariables>(
  request: (http: HttpStart, variables: TVariables) => Promise<BoostState>,
  errorTitle: string
) => {
  const { http, notifications } = useBoostServices();
  const queryClient = useQueryClient();

  return useMutation<BoostState, IHttpFetchError, TVariables>({
    mutationFn: (variables) => request(http, variables),
    onSuccess: (state) => {
      queryClient.setQueryData(BOOST_STATE_QUERY_KEY, state);
      // What applies to each index or data stream may have changed with it.
      queryClient.invalidateQueries({ queryKey: BOOST_EXPLAIN_QUERY_KEY });
    },
    onError: (error) => notifications.toasts.addError(error, { title: errorTitle }),
  });
};

export const useCreateProfile = () =>
  useBoostMutation(
    (http, profile: BoostProfileInput) =>
      http.post<BoostState>(BOOST_PROFILES_API_PATH, { body: JSON.stringify(profile) }),
    i18n.translate('xpack.boost.createProfileErrorTitle', {
      defaultMessage: 'Unable to create boost profile',
    })
  );

export const useUpdateProfile = () =>
  useBoostMutation(
    (http, profile: BoostProfileInput) =>
      http.put<BoostState>(`${BOOST_PROFILES_API_PATH}/${encodeURIComponent(profile.name)}`, {
        body: JSON.stringify(profile),
      }),
    i18n.translate('xpack.boost.updateProfileErrorTitle', {
      defaultMessage: 'Unable to save boost profile',
    })
  );

export const useDeleteProfile = () =>
  useBoostMutation(
    (http, name: string) =>
      http.delete<BoostState>(`${BOOST_PROFILES_API_PATH}/${encodeURIComponent(name)}`),
    i18n.translate('xpack.boost.deleteProfileErrorTitle', {
      defaultMessage: 'Unable to delete boost profile',
    })
  );

export const useCreateRule = () =>
  useBoostMutation(
    (http, rule: BoostRuleInput) =>
      http.post<BoostState>(BOOST_RULES_API_PATH, { body: JSON.stringify(rule) }),
    i18n.translate('xpack.boost.createRuleErrorTitle', {
      defaultMessage: 'Unable to create boost rule',
    })
  );

export const useUpdateRule = () =>
  useBoostMutation(
    (http, rule: BoostRuleInput) =>
      http.put<BoostState>(`${BOOST_RULES_API_PATH}/${encodeURIComponent(rule.name)}`, {
        body: JSON.stringify(rule),
      }),
    i18n.translate('xpack.boost.updateRuleErrorTitle', {
      defaultMessage: 'Unable to save boost rule',
    })
  );

/** Sets the project's default for a profile type: the profile its default rule uses. */
export const useUpdateDefaultRule = () =>
  useBoostMutation(
    (http, { type, profileName }: { type: BoostProfileType; profileName: string }) =>
      http.put<BoostState>(`${BOOST_DEFAULT_RULES_API_PATH}/${encodeURIComponent(type)}`, {
        body: JSON.stringify({ boost_profile: profileName }),
      }),
    i18n.translate('xpack.boost.updateDefaultRuleErrorTitle', {
      defaultMessage: 'Unable to save project default',
    })
  );

export const useDeleteRule = () =>
  useBoostMutation(
    (http, name: string) =>
      http.delete<BoostState>(`${BOOST_RULES_API_PATH}/${encodeURIComponent(name)}`),
    i18n.translate('xpack.boost.deleteRuleErrorTitle', {
      defaultMessage: 'Unable to delete boost rule',
    })
  );
