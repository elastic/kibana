/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INTERNAL_RULE_ID_KEY } from '../../../../common/constants';

export const addRuleIdToTags = (tags: string[], ruleId: string | null | undefined): string[] => {
  if (ruleId == null) {
    return tags;
  } else {
    return [...tags, `${INTERNAL_RULE_ID_KEY}:${ruleId}`];
  }
};
