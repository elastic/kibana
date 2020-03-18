/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  INTERNAL_RULE_ID_KEY,
  INTERNAL_IMMUTABLE_KEY,
  INTERNAL_NOTIFICATION_ID_KEY,
} from '../../../../common/constants';

export const addTags = (
  tags: string[],
  ruleId: string,
  immutable: boolean,
  notificationId?: string
): string[] => {
  const newTags = [
    ...tags,
    `${INTERNAL_RULE_ID_KEY}:${ruleId}`,
    `${INTERNAL_IMMUTABLE_KEY}:${immutable}`,
  ];

  if (notificationId) {
    newTags.push(`${INTERNAL_NOTIFICATION_ID_KEY}:${notificationId}`);
  }

  return Array.from(new Set(newTags));
};
