/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRuleSnoozed } from '../../../lib';
import type {
  AlertInstanceState as State,
  AlertInstanceContext as Context,
  RuleTypeParams,
} from '../../../types';
import type { AlertReducerFn, ReducerOpts } from '.';

export const reduceSnoozed: AlertReducerFn = async <
  P extends RuleTypeParams,
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: ReducerOpts<P, S, C, G, R>
) => {
  const logger = opts.context.logger.get('reduceSnoozed');
  logger.info(`Filtering alerts where rule is snoozed`);

  return isRuleSnoozed(opts.context.rule) ? [] : opts.alerts;
};
