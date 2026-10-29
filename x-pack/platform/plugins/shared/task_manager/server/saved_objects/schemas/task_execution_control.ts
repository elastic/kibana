/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const taskExecutionControlSchemaV1 = schema.object({
  // When true, all task claiming is paused across every Kibana node.
  paused: schema.boolean(),
  // Exact task type names whose claiming is paused (runtime equivalent of
  // `xpack.task_manager.unsafe.exclude_task_types`).
  paused_task_types: schema.arrayOf(schema.string()),
  updated_at: schema.string(),
  updated_by: schema.maybe(schema.string()),
});

export type TaskExecutionControl = TypeOf<typeof taskExecutionControlSchemaV1>;
