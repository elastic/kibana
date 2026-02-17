/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { RulesApi } from '../services/rules_api';

export function useDisableRule() {
  const rulesApi = useService(RulesApi);
  const notifications = useService(CoreStart('notifications'));

  const disableRule = async (id: string) => {
    try {
      await rulesApi.disableRule(id);
      notifications?.toasts.addSuccess({
        title: i18n.translate('xpack.alertingV2.ruleDetails.ruleDisableSuccess', {
          defaultMessage: 'Rule disabled',
        }),
      });
    } catch (err) {
      notifications?.toasts.addError(err, {
        title: i18n.translate('xpack.alertingV2.ruleDetails.ruleDisableError', {
          defaultMessage: 'Unable to disable rule',
        }),
      });
    }
  };

  return { disableRule };
}
