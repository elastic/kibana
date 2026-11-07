/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
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
import type { RequestErrorDescription } from '../request_error';
import { describeRequestError } from '../request_error';
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

/** A rule or profile that deleting a profile couldn't delete, and why. */
export interface FailedDeletion extends RequestErrorDescription {
  kind: 'rule' | 'profile';
  name: string;
}

/** What deleting a profile and the rules that use it did. */
export interface ProfileDeletion {
  /** How many rules used the profile, all of which were to be deleted first. */
  ruleCount: number;
  /** What couldn't be deleted: some of the rules, or else the profile. Empty once all are gone. */
  failures: FailedDeletion[];
}

const isNotFound = (error: IHttpFetchError) => error.response?.status === 404;

/**
 * Deletes a custom profile and the custom rules that use it. Elasticsearch won't delete a profile
 * that rules use, so each rule is deleted first, with its own request, and any of them can fail. A
 * rule that's already gone counts as deleted. If any rule is left, the profile is kept, since
 * Elasticsearch would refuse it anyway. The function keeps working once the component is gone, so a
 * toast can try again with it.
 */
export const useDeleteProfileAndRules = () => {
  const { http } = useBoostServices();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteProfile = useCallback(
    async ({ name, ruleNames }: { name: string; ruleNames: readonly string[] }) => {
      setIsDeleting(true);
      try {
        const results = await Promise.allSettled(
          ruleNames.map((ruleName) =>
            http.delete(`${BOOST_RULES_API_PATH}/${encodeURIComponent(ruleName)}`)
          )
        );
        const failures = results.flatMap((result, index): FailedDeletion[] =>
          result.status === 'rejected' && !isNotFound(result.reason)
            ? [{ kind: 'rule', name: ruleNames[index], ...describeRequestError(result.reason) }]
            : []
        );
        if (failures.length > 0) {
          return { ruleCount: ruleNames.length, failures };
        }
        try {
          await http.delete(`${BOOST_PROFILES_API_PATH}/${encodeURIComponent(name)}`);
          return { ruleCount: ruleNames.length, failures: [] };
        } catch (error) {
          return {
            ruleCount: ruleNames.length,
            failures: [{ kind: 'profile' as const, name, ...describeRequestError(error) }],
          };
        }
      } finally {
        // Whatever was deleted changes what applies, even when something else failed.
        queryClient.invalidateQueries({ queryKey: BOOST_STATE_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: BOOST_EXPLAIN_QUERY_KEY });
        setIsDeleting(false);
      }
    },
    [http, queryClient]
  );

  return { deleteProfile, isDeleting };
};

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

/**
 * Deletes a custom rule, updating the state, and throws what went wrong for the caller to report.
 * The function keeps working once the component is gone, so a toast can try again with it.
 */
export const useDeleteRule = () => {
  const { http } = useBoostServices();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteRule = useCallback(
    async (name: string): Promise<void> => {
      setIsDeleting(true);
      try {
        const state = await http.delete<BoostState>(
          `${BOOST_RULES_API_PATH}/${encodeURIComponent(name)}`
        );
        queryClient.setQueryData(BOOST_STATE_QUERY_KEY, state);
        queryClient.invalidateQueries({ queryKey: BOOST_EXPLAIN_QUERY_KEY });
      } finally {
        setIsDeleting(false);
      }
    },
    [http, queryClient]
  );

  return { deleteRule, isDeleting };
};
