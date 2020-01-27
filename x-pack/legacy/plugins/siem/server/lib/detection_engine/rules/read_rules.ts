/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INTERNAL_RULE_ID_KEY } from '../../../../common/constants';
import { findRules } from './find_rules';
import { RuleAlertType, ReadRuleParams, isAlertType } from './types';

/**
 * This reads the rules through a cascade try of what is fastest to what is slowest.
 * @param id - This is the fastest. This is the auto-generated id through the parameter id.
 * and the id will either be found through `alertsClient.get({ id })` or it will not
 * be returned as a not-found or a thrown error that is not 404.
 * @param ruleId - This is a close second to being fast as long as it can find the rule_id from
 * a filter query against the tags using `alert.attributes.tags: "__internal:${ruleId}"]`
 */
export const readRules = async ({
  alertsClient,
  id,
  ruleId,
}: ReadRuleParams): Promise<RuleAlertType | null> => {
  if (id != null) {
    try {
      const rule = await alertsClient.get({ id });
      if (isAlertType(rule)) {
        return rule;
      } else {
        return null;
      }
    } catch (err) {
      if (err.output.statusCode === 404) {
        return null;
      } else {
        // throw non-404 as they would be 500 or other internal errors
        throw err;
      }
    }
  } else if (ruleId != null) {
    const ruleFromFind = await findRules({
      alertsClient,
      filter: `alert.attributes.tags: "${INTERNAL_RULE_ID_KEY}:${ruleId}"`,
      page: 1,
    });
    if (ruleFromFind.data.length === 0 || !isAlertType(ruleFromFind.data[0])) {
      return null;
    } else {
      return ruleFromFind.data[0];
    }
  } else {
    // should never get here, and yet here we are.
    return null;
  }
};
