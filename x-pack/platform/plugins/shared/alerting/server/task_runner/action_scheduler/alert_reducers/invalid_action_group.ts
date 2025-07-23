/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertCategory } from '../../../alerts_client/types';
import {
  type AlertInstanceState as State,
  type AlertInstanceContext as Context,
  type RuleTypeParams,
} from '../../../types';
import type { AlertReducerFn, ReducerOpts } from '.';

export const reduceInvalidActionGroup: AlertReducerFn = async <
  P extends RuleTypeParams,
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: ReducerOpts<P, S, C, G, R>
) => {
  const logger = opts.context.logger.get('reduceInvalidActionGroup');
  logger.info(`Filtering alerts with invalid action groups`);

  const ruleTypeActionGroups = new Map(
    opts.context.ruleType.actionGroups.map((actionGroup) => [actionGroup.id, actionGroup.name])
  );

  return opts.alerts.filter(({ alert, category }) => {
    if (category === AlertCategory.New || category === AlertCategory.Ongoing) {
      const alertsActionGroup = alert.getScheduledActionOptions()?.actionGroup;
      if (!ruleTypeActionGroups!.has(alertsActionGroup as G)) {
        logger.error(
          `Invalid action group "${alertsActionGroup}" for rule "${opts.context.ruleType.id}".`
        );
        return false;
      }
    }
    return true;
  });
};
