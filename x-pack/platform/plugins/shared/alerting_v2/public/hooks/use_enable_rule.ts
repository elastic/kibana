/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { RulesApi } from '../services/rules_api';

export function useEnableRule() {
  const rulesApi = useService(RulesApi);
  const notifications = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  const enableRule = async (id: string) => {
    try {
      await rulesApi.enableRule(id);
      notifications?.toasts.addSuccess({
        title: i18n.translate('xpack.alertingV2.ruleDetails.ruleEnableSuccess', {
          defaultMessage: 'Rule enabled',
        }),
      });
      queryClient.invalidateQueries({ queryKey: ['rule', id], exact: false });
    } catch (err) {
      notifications?.toasts.addError(err, {
        title: i18n.translate('xpack.alertingV2.ruleDetails.ruleEnableError', {
          defaultMessage: 'Unable to enable rule',
        }),
      });
    }
  };

  return { enableRule };
}
