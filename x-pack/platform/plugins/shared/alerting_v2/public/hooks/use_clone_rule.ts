/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { type RuleApiResponse, RulesApi } from '../services/rules_api';

export function useCloneRule() {
  const rulesApi = useService(RulesApi);
  const notifications = useService(CoreStart('notifications'));

  const cloneRule = async (rule: RuleApiResponse) => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = rule;
    const clonedRule = {
      ...rest,
      metadata: {
        ...rule.metadata,
        name: `${rule.metadata.name} (Clone)`,
      },
    };

    try {
      await rulesApi.createRule(clonedRule);
      notifications?.toasts.addSuccess({
        title: i18n.translate('xpack.alertingV2.ruleDetails.ruleCloneSuccess', {
          defaultMessage: 'Rule cloned',
        }),
      });
    } catch (err) {
      notifications?.toasts.addError(err as Error, {
        title: i18n.translate('xpack.alertingV2.ruleDetails.ruleCloneError', {
          defaultMessage: 'Unable to clone rule',
        }),
      });
    }
  };

  return { cloneRule };
}
