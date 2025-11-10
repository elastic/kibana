/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlRuleParams } from '@kbn/response-ops-rule-params/esql';
import type { RuleExecutorOptions, RuleTypeParams } from '../../types';
import type { EsqlAlertState, EsqlRuleState } from './rule_type_params';
import type { ActionGroupId } from '../../../common/es_query';
import type { StackAlertType } from '../types';

export type OnlyEsqlQueryRuleParams = EsqlRuleParams;

export type ExecutorOptions<P extends RuleTypeParams> = RuleExecutorOptions<
  P,
  EsqlRuleState,
  EsqlAlertState,
  {},
  typeof ActionGroupId,
  StackAlertType
>;
