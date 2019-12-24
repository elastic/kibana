/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INTERNAL_RULE_ID_KEY, INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';

export const addTags = (
  tags: string[] | null | undefined,
  ruleId: string | null | undefined,
  immutable: boolean | null | undefined
): string[] => {
  const defaultedTags = tags != null ? tags : [];
  if (ruleId != null && immutable != null) {
    return [
      ...defaultedTags,
      `${INTERNAL_RULE_ID_KEY}:${ruleId}`,
      `${INTERNAL_IMMUTABLE_KEY}:${immutable}`,
    ];
  } else if (ruleId != null && immutable == null) {
    return [...defaultedTags, `${INTERNAL_RULE_ID_KEY}:${ruleId}`];
  } else if (ruleId == null && immutable != null) {
    return [...defaultedTags, `${INTERNAL_IMMUTABLE_KEY}:${immutable}`];
  } else {
    return defaultedTags;
  }
};
