/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleFormData, RuleTypeModel } from '@kbn/response-ops-rule-form';
import { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import { ActionTypeModel } from '@kbn/alerts-ui-shared';
import type { LensInternalApi } from '../types';

export function initializeAlertRules({
  alertRuleInitialValues$,
  isRuleFormVisible$,
  alertingTypeRegistries$,
}: LensInternalApi) {
  return {
    api: {
      createAlertRule: (
        initialValues: Partial<RuleFormData>,
        ruleTypeRegistry: TypeRegistry<RuleTypeModel>,
        actionTypeRegistry: TypeRegistry<ActionTypeModel>
      ) => {
        alertingTypeRegistries$.next({
          ruleTypeRegistry,
          actionTypeRegistry,
        });
        alertRuleInitialValues$.next(initialValues);
        isRuleFormVisible$.next(true);
      },
    },
  };
}
