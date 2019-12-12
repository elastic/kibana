/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskInstance, TaskInstanceWithDeprecatedFields } from '../task';

export function ensureDeprecatedFieldsAreCorrected({
  interval,
  schedule,
  ...taskInstance
}: TaskInstanceWithDeprecatedFields): TaskInstance {
  return {
    ...taskInstance,
    schedule: schedule || (interval ? { interval } : undefined),
  };
}
