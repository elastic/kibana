/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutorOptions, RuleTypeParams } from '../../types';
import { ActionContext } from './action_context';
import { EsQueryRuleParams, EsQueryRuleState } from './rule_type_params';
import { ActionGroupId } from './constants';
import { StackAlertType } from '../types';

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
  {},
  ActionContext,
  typeof ActionGroupId,
  StackAlertType
>;
