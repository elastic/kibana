/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { RulesApi } from '../services/rules_api';
import { ruleKeys } from './query_key_factory';

export function useExistingRule(ruleId: string) {
  const rulesApi = useService(RulesApi);
  const notifications = useService(CoreStart('notifications'));

  const {
    data: rule,
    isLoading,
    error,
  } = useQuery({
    queryKey: ruleKeys.detail(ruleId),
    queryFn: () => rulesApi.getRule(ruleId),
    enabled: !!ruleId,
    onError: (err: Error) => {
      notifications?.toasts.addError(err, {
        title: i18n.translate('xpack.alertingV2.ruleDetails.ruleLoadError', {
          defaultMessage: 'Unable to load rule',
        }),
      });
    },
  });

  return { rule, isLoading, error };
}
