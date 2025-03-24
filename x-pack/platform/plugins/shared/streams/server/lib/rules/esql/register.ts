/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, RuleTypeState } from '@kbn/alerting-plugin/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { ESQL_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { technicalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/technical_rule_field_map';
import { PersistenceAlertType } from '@kbn/rule-registry-plugin/server';
import { getRuleExecutor } from './executor';
import { EsqlRuleParams, esqlRuleParams } from './types';

export function esqlRuleType(): PersistenceAlertType<
  EsqlRuleParams,
  RuleTypeState,
  AlertInstanceContext,
  'default'
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
    defaultActionGroupId: 'default',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: 'observability',
    solution: 'observability',
    minimumLicenseRequired: 'basic',
    isExportable: false,
    actionVariables: {},
    executor: getRuleExecutor,
    autoRecoverAlerts: false,
    alerts: {
      context: 'observability.streams',
      mappings: { dynamic: false, fieldMap: { ...technicalRuleFieldMap } },
      useEcs: true,
      useLegacyAlerts: true,
      shouldWrite: false,
    },
  };
}
