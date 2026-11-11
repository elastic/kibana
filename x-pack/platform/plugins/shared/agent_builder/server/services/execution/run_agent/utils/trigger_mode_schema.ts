/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ChatTriggerMode } from '@kbn/agent-builder-common';

/**
 * The `trigger_mode` parameter of the tools that run a sub-agent in the background. Offered only
 * while a finished sub-agent can wake the parent, so the model is never promised a wake that
 * will not come.
 */
export const triggerModeSchema = lazySchema(() =>
  z
    .enum([ChatTriggerMode.Always, ChatTriggerMode.Never])
    .optional()
    .describe(
      'Only with run_in_background. Leave unset: the sub-agent wakes you with its result as soon as it finishes, so you can report it. Set "never" only when the user said not to interrupt them; the result then waits in the conversation until the next turn.'
    )
);
