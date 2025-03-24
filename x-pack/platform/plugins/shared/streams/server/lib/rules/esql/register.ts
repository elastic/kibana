/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleType,
  RuleTypeParams,
  RuleTypeState,
} from '@kbn/alerting-plugin/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { ESQL_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { Alert } from '@kbn/alerts-as-data-utils';
import { getRuleExecutor } from './executor';
import { ALERT_ACTION, EsqlRuleParams, esqlRuleParams } from './types';

export function esqlRuleType(): RuleType<
  EsqlRuleParams,
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  string,
  string,
  Alert
> {
  return {
    id: ESQL_RULE_TYPE_ID,
    name: 'ES|QL Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          return esqlRuleParams.parse(object);
        },
      },
    },
    schemas: {
      params: { type: 'zod', schema: esqlRuleParams },
    },
    defaultActionGroupId: ALERT_ACTION.id,
    actionGroups: [ALERT_ACTION],
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: 'observability',
    solution: 'observability',
    minimumLicenseRequired: 'basic',
    isExportable: false,
    actionVariables: {},
    executor: getRuleExecutor(),
  };
}
