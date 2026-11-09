/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { ExecutionError } from '@kbn/workflows/server';

/**
 * Applies a step's declared `inputSchema` to what the engine actually hands the
 * handler.
 *
 * Nothing else does. `CustomStepImpl.getInput()` renders the `with` block
 * through the templating engine and returns it unparsed, and `inputSchema` is
 * never referenced at execution time — it shapes the editor and the YAML
 * validation only.
 */
export const parseStepInput = <Schema extends z.ZodType>(
  schema: Schema,
  input: unknown
): z.output<Schema> => {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  // `ValidationError` rather than a bare throw: a workflow can only branch on
  // an `ExecutionError`'s type, and a malformed input is the caller's problem
  // to fix rather than something to retry.
  const issues = parsed.error.issues
    .map(({ path, message }) => `${path.join('.') || '(root)'}: ${message}`)
    .join('; ');

  throw new ExecutionError({ type: 'ValidationError', message: `Invalid step input — ${issues}` });
};
