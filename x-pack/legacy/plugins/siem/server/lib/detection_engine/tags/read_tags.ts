/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsClient } from '../../../../../alerting';
import { findRules } from '../rules/find_rules';

const DEFAULT_PER_PAGE: number = 1000;

export interface TagType {
  id: string;
  tags: string[];
}
// Note: This is doing an in-memory aggregation of the tags by calling each of the alerting
// records in batches of this const setting and uses the fields to try to get the least
// amount of data per record back. If saved objects at some point supports aggregations
// then this should be replaced with a an aggregation call.
// Ref: https://www.elastic.co/guide/en/kibana/master/saved-objects-api.html
export const readTags = async ({
  alertsClient,
  perPage = DEFAULT_PER_PAGE,
}: {
  alertsClient: AlertsClient;
  perPage?: number;
}): Promise<object[] | null> => {
  const firstTags = await findRules({ alertsClient, fields: ['tags'], perPage, page: 1 });
  console.log('First tags are:', firstTags);
  const totalPages = Math.ceil(firstTags.total / firstTags.perPage);
  const returnTags = Array(totalPages)
    .fill({})
    .map((_, page) => {
      // page index never starts at zero. It always has to be 1 or greater
      return findRules({ alertsClient, fields: ['tags'], page: page + 1 });
    })
    .reduce<Promise<object[] | null>>(async (accum, nextTagPage) => {
      const nextTags = await nextTagPage;
      console.log('next tags found are:', nextTags);
      // accum = accum.concat(nextTags.data);
      return accum;
    }, Promise.resolve([]));
  return [];
  /*
  const returnTags = Array(totalPages)
    .fill({})
    .map((_, page) => {
      // page index never starts at zero. It always has to be 1 or greater
      return findRules({ alertsClient, fields: ['tags'], page: page + 1 });
    })
    .reduce<object[]>((accum, nextTagPage) => {
      const nextTags = await nextTagPage;
      console.log('next tags found are:', nextTags);
      accum = accum.concat(nextTags.data);
      return accum;
    }, []);
  console.log('All tags are:', returnTags);
  return returnTags;
  */
};

/*
  const returnTags = firstTags.data;
  const firstRule = findRuleInArrayByRuleId(firstRules.data, ruleId);
  if (firstRule != null) {
    return firstRule;
  } else {
    const totalPages = Math.ceil(firstRules.total / firstRules.perPage);
    return Array(totalPages)
      .fill({})
      .map((_, page) => {
        // page index never starts at zero. It always has to be 1 or greater
        return findRules({ alertsClient, page: page + 1 });
      })
      .reduce<Promise<RuleAlertType | null>>(async (accum, findRule) => {
        const rules = await findRule;
        const rule = findRuleInArrayByRuleId(rules.data, ruleId);
        if (rule != null) {
          return rule;
        } else {
          return accum;
        }
      }, Promise.resolve(null));
  }
  */

/*
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
*/
