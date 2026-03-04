/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { RulesApi } from '../services/rules_api';
import { ruleKeys } from './query_key_factory';

export function useDisableRule() {
  const rulesApi = useService(RulesApi);
  const notifications = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation(
    ['disableRule'],
    ({ id }: { id: string }) => {
      return rulesApi.disableRule(id);
    },
    {
      onError: (error) => {
        notifications?.toasts.addError(error as Error, {
          title: i18n.translate('xpack.alertingV2.ruleDetails.ruleDisableError', {
            defaultMessage: 'Unable to disable rule',
          }),
        });
      },
      onSuccess: (_data, { id }) => {
        queryClient.invalidateQueries({ queryKey: ruleKeys.detail(id), exact: false });
        notifications?.toasts.addSuccess({
          title: i18n.translate('xpack.alertingV2.ruleDetails.ruleDisableSuccess', {
            defaultMessage: 'Rule disabled',
          }),
        });
      },
    }
  );
}
