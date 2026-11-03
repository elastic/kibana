/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { parseIntervalAsMillisecond } from './intervals';

const validateInterval = (duration: string) => {
  try {
    parseIntervalAsMillisecond(duration);
  } catch (err) {
    return `string is not a valid duration: ${duration}`;
  }
};

/** Config for a plugin's API key invalidation task. Only accepts intervals the task can parse. */
export const apiKeyInvalidationTaskConfigSchema = schema.object({
  interval: schema.string({ validate: validateInterval, defaultValue: '5m' }),
  removalDelay: schema.string({ validate: validateInterval, defaultValue: '1h' }),
});
