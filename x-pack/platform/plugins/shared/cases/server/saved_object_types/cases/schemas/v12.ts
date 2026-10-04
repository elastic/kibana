/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { casesSchema as casesSchemaV11 } from './v11';

/**
 * Pause tracking: `paused_at` is set while the case sits in a status that pauses time
 * tracking, `time_paused` accumulates the seconds spent there.
 */
export const casesSchema = casesSchemaV11.extends({
  paused_at: schema.maybe(schema.nullable(schema.string())),
  time_paused: schema.maybe(schema.nullable(schema.number())),
  pause_reason: schema.maybe(schema.nullable(schema.string())),
  resume_to_status_key: schema.maybe(schema.nullable(schema.string())),
});
