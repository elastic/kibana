/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { findRules } from './find_rules';
import { RuleAlertType, isAlertTypeArray, ReadRuleParams, ReadRuleByRuleId } from './types';

export const findRuleInArrayByRuleId = (
  objects: object[],
  ruleId: string
): RuleAlertType | null => {
  if (isAlertTypeArray(objects)) {
    const signals: RuleAlertType[] = objects;
    const signal: RuleAlertType[] = signals.filter(datum => {
      return datum.params.ruleId === ruleId;
    });
    if (signal.length !== 0) {
      return signal[0];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

// This an extremely slow and inefficient way of getting a signal by its id.
// I have to manually query every single record since the Signal Params are
// not indexed and I cannot push in my own _id when I create an alert at the moment.
// TODO: Once we can directly push in the _id, then we should no longer need this way.
// TODO: This is meant to be _very_ temporary.
export const readRuleByRuleId = async ({
  alertsClient,
  ruleId,
}: ReadRuleByRuleId): Promise<RuleAlertType | null> => {
  const firstSignals = await findRules({ alertsClient, page: 1 });
  const firstSignal = findRuleInArrayByRuleId(firstSignals.data, ruleId);
  if (firstSignal != null) {
    return firstSignal;
  } else {
    const totalPages = Math.ceil(firstSignals.total / firstSignals.perPage);
    return Array(totalPages)
      .fill({})
      .map((_, page) => {
        // page index never starts at zero. It always has to be 1 or greater
        return findRules({ alertsClient, page: page + 1 });
      })
      .reduce<Promise<RuleAlertType | null>>(async (accum, findSignal) => {
        const signals = await findSignal;
        const signal = findRuleInArrayByRuleId(signals.data, ruleId);
        if (signal != null) {
          return signal;
        } else {
          return accum;
        }
      }, Promise.resolve(null));
  }
};

export const readRules = async ({ alertsClient, id, ruleId }: ReadRuleParams) => {
  if (id != null) {
    try {
      const output = await alertsClient.get({ id });
      return output;
    } catch (err) {
      if (err.output.statusCode === 404) {
        return null;
      } else {
        // throw non-404 as they would be 500 or other internal errors
        throw err;
      }
    }
  } else if (ruleId != null) {
    return readRuleByRuleId({ alertsClient, ruleId });
  } else {
    // should never get here, and yet here we are.
    return null;
  }
};
