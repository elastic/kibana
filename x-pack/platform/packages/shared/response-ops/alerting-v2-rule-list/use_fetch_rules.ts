/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useRuleListServices } from './rule_list_context';
import { listRules } from './rules_api';
import { ruleKeys } from './query_key_factory';

export const useFetchRules = ({ page, perPage }: { page: number; perPage: number }) => {
  const { http, notifications } = useRuleListServices();

  return useQuery({
    queryKey: ruleKeys.list({ page, perPage }),
    queryFn: () => listRules(http, { page, perPage }),
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useFetchRules.errorMessage', {
          defaultMessage: 'Failed to load rules',
        })
      );
    },
    keepPreviousData: true,
  });
};
