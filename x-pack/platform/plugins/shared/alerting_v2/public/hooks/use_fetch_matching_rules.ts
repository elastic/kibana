/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import type { MatchRulesBody, PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { RulesApi } from '../services/rules_api';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';
import { ruleKeys } from './query_key_factory';

export interface MatchRulesUiParams {
  matcher?: PolicyMatcher | null;
  page?: number;
  perPage?: number;
}

export const toMatchRulesBody = ({
  matcher,
  page,
  perPage,
  ...rest
}: MatchRulesUiParams): Complete<MatchRulesBody> => {
  assertAllFieldsMapped(rest);
  return {
    matcher,
    page,
    per_page: perPage,
  };
};

export const useFetchMatchingRules = (params: MatchRulesUiParams) => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery({
    queryKey: ruleKeys.matchList(params),
    queryFn: () => rulesApi.matchRules(toMatchRulesBody(params)),
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useFetchMatchingRules.errorMessage', {
          defaultMessage: 'Failed to load the rules matching this policy',
        })
      );
    },
    keepPreviousData: true,
    retry: false,
    refetchOnWindowFocus: false,
  });
};
