/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { EventActorType } from '../timeline_events';

export const executionAbortedEventDataSchema = z.object({
  aborted_by: z
    .object({
      type: z.enum(EventActorType),
      id: z.string(),
      username: z.string().optional(),
      full_name: z.string().optional(),
    })
    .optional(),
});
