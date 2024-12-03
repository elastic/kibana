/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, RuleTypeParams, RuleTypeState } from '@kbn/alerting-plugin/common';
import { IRuleDataClient } from '../rule_data_client';
import { AlertTypeWithExecutor } from '../types';

export const withRuleDataClientFactory =
  (ruleDataClient: IRuleDataClient) =>
  <
    TState extends RuleTypeState,
    TParams extends RuleTypeParams,
    TAlertInstanceContext extends AlertInstanceContext,
    TServices extends Record<string, any> = {}
  >(
    type: AlertTypeWithExecutor<
      TState,
      TParams,
      TAlertInstanceContext,
      TServices & { ruleDataClient: IRuleDataClient }
    >
  ): AlertTypeWithExecutor<
    TState,
    TParams,
    TAlertInstanceContext,
    TServices & { ruleDataClient: IRuleDataClient }
  > => {
    return {
      ...type,
      executor: (options) => {
        return type.executor({
          ...options,
          services: {
            ...options.services,
            ruleDataClient,
          },
        });
      },
    };
  };
