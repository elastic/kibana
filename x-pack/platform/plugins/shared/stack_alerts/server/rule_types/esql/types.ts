/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutorOptions, RuleTypeParams } from '../../types';
import type { ActionContext } from './action_context';
import type { ESQLAlertState, ESQLRuleState } from './rule_type_params';
import type { ActionGroupId } from '../../../common/esql';
import type { StackAlertType } from '../types';

export type ExecutorOptions<P extends RuleTypeParams> = RuleExecutorOptions<
  P,
  ESQLRuleState,
  ESQLAlertState,
  ActionContext,
  typeof ActionGroupId,
  StackAlertType
>;

export type ESQLSourceFields = Array<{
  label: string;
  searchPath: string;
}>;
