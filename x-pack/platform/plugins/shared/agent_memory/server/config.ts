/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  /**
   * Whether agent memory is available at all in this deployment.
   *
   * Off by default while the feature is pre-GA. This gate is read at setup, so
   * flipping it requires a restart — everything memory owns (data streams,
   * routes, tools, skills, workflows) is created at setup or start.
   */
  enabled: schema.boolean({ defaultValue: false }),
});

export type AgentMemoryConfig = TypeOf<typeof configSchema>;
