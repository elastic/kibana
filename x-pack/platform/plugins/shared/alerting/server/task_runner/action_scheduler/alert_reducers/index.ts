/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { UntypedNormalizedRuleType } from '../../../rule_type_registry';
import type { AlertsResult } from '../../../alerts_client/types';
import type {
  AlertInstanceState as State,
  AlertInstanceContext as Context,
  RuleTypeParams,
} from '../../../types';
import type { ActionSchedulerRule, RuleActionWithSummary } from '../types';

function asyncPipe<
  P extends RuleTypeParams,
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(...fns: AlertReducerFn[]) {
  return async (input: AlertsResult<S, C, G>, context: ReducerContext<P>) => {
    let acc = input;
    for (const mapper of fns) {
      acc = await mapper({ alerts: acc, context });
    }
    return acc;
  };
}

export interface ReducerOpts<
  P extends RuleTypeParams,
  S extends State,
  C extends Context,
  G extends string,
  R extends string
> {
  alerts: AlertsResult<S, C, G>;
  context: ReducerContext<P>;
}

export type AlertReducerFn = <
  P extends RuleTypeParams,
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: ReducerOpts<P, S, C, G, R>
) => Promise<AlertsResult<S, C, G>>;

export interface ReducerContext<P extends RuleTypeParams> {
  action?: RuleActionWithSummary;
  logger: Logger;
  rule: ActionSchedulerRule<P>;
  ruleType: UntypedNormalizedRuleType;
}

export async function reduceAlerts<
  P extends RuleTypeParams,
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  alerts: AlertsResult<S, C, G>,
  reducers: Readonly<AlertReducerFn[]>,
  reducerContext: ReducerContext<P>
): Promise<AlertsResult<S, C, G>> {
  return await asyncPipe<P, S, C, G, R>(...Object.values(reducers))(alerts, reducerContext);
}
