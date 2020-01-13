/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskInstance, TaskInstanceWithDeprecatedFields } from '../task';
import { Logger } from '../types';

export function ensureDeprecatedFieldsAreCorrected(
  { id, taskType, interval, schedule, ...taskInstance }: TaskInstanceWithDeprecatedFields,
  logger: Logger
): TaskInstance {
  if (interval) {
    logger.warn(
      `Task${
        id ? ` "${id}"` : ''
      } of type "${taskType}" has been scheduled with the deprecated 'interval' field which is due to be removed in a future release`
    );
  }
  return {
    id,
    taskType,
    ...taskInstance,
    schedule: schedule || (interval ? { interval } : undefined),
  };
}
