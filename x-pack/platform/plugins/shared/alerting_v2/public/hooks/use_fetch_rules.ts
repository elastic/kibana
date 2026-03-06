/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';
import { ruleKeys } from './query_key_factory';

export const useFetchRules = ({ page, perPage }: { page: number; perPage: number }) => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery({
    queryKey: ruleKeys.list({ page, perPage }),
    queryFn: () => rulesApi.listRules({ page, perPage }),
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useFetchRules.errorMessage', {
          defaultMessage: 'Failed to load rules',
        })
      );
    },
    keepPreviousData: true,
  });
};
