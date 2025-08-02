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
  RuleNotifyWhen,
} from '../../../types';
import type { AlertReducerFn, ReducerOpts } from '.';
import { generateActionHash } from '../lib';

export const reduceNotifyWhen: AlertReducerFn = async <
  P extends RuleTypeParams,
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: ReducerOpts<P, S, C, G, R>
) => {
  const logger = opts.context.logger.get('reduceNotifyWhen');
  logger.info(`Filtering alerts that do not meet the notifyWhen condition for this action`);

  if (!opts.context.action) {
    // If there is no action, we cannot filter alerts based on the action frequency
    return opts.alerts;
  }

  const notifyWhen = opts.context.action.frequency?.notifyWhen || opts.context.rule.notifyWhen;

  return opts.alerts.filter(({ alert, category }) => {
    const alertId = alert.getId();
    if (category === AlertCategory.New || category === AlertCategory.Ongoing) {
      if (notifyWhen === RuleNotifyWhen.CHANGE && !alert.scheduledActionGroupHasChanged()) {
        logger.debug(
          `skipping scheduling of actions for '${alertId}' in rule ${opts.context.rule.id}: alert is active but action group has not changed`
        );
        return false;
      }

      if (notifyWhen === RuleNotifyWhen.THROTTLE) {
        const throttle = opts.context.action?.frequency?.throttle;
        const throttled = throttle
          ? alert.isThrottled({
              throttle: throttle ?? null,
              actionHash: generateActionHash(opts.context.action), // generateActionHash must be removed once all the hash identifiers removed from the task state
              uuid: opts.context.action?.uuid,
            })
          : alert.isThrottled({ throttle: opts.context.rule.throttle ?? null });

        if (throttled) {
          logger.debug(
            `skipping scheduling of actions for '${alertId}' in rule ${opts.context.rule.id}: rule is throttled`
          );
          return false;
        }
      }
    }

    return true;
  });
};
