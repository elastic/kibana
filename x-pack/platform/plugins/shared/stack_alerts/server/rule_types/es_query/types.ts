/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsQueryRuleParams } from '@kbn/response-ops-rule-params/es_query';
import type { RuleExecutorOptions, RuleTypeParams } from '../../types';
import type { ActionContext } from './action_context';
import type { EsQueryAlertState, EsQueryRuleState } from './rule_type_params';
import type { ActionGroupId } from '../../../common/es_query';
import type { StackAlertType } from '../types';

export type OnlyEsQueryRuleParams = Omit<EsQueryRuleParams, 'searchConfiguration' | 'esqlQuery'> & {
  searchType: 'esQuery';
  timeField: string;
};

export type OnlySearchSourceRuleParams = Omit<
  EsQueryRuleParams,
  'esQuery' | 'index' | 'esqlQuery'
> & {
  searchType: 'searchSource';
};

export type OnlyEsqlQueryRuleParams = Omit<
  EsQueryRuleParams,
  'esQuery' | 'index' | 'searchConfiguration'
> & {
  searchType: 'esqlQuery';
  timeField: string;
};

export type ExecutorOptions<P extends RuleTypeParams> = RuleExecutorOptions<
  P,
  EsQueryRuleState,
  EsQueryAlertState,
  ActionContext,
  typeof ActionGroupId,
  StackAlertType
>;
