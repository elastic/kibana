/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isErrorResult } from '@kbn/agent-builder-common/tools';
import type { RunToolReturn } from '@kbn/agent-builder-server/runner';

/**
 * Outcome of shaping a tool's {@link RunToolReturn} for `exec_tool`'s stdout.
 * On success, `value` is JSON-serialized to stdout; on failure, `error` goes
 * to stderr and the command exits non-zero.
 */
export type FormattedToolReturn = { ok: true; value: unknown } | { ok: false; error: string };

/**
 * Shape a tool return to match how results are stored on the VFS: strip the
 * `{ tool_result_id, type, data }` envelope down to the `data` payload.
 *
 * - a single result   -> that result's `data`
 * - zero or many       -> an array of each result's `data` (empty -> `[]`)
 * - any error result   -> failure carrying the error message(s)
 * - a `prompt` (interruption) -> failure (interrupting tools can't be piped)
 */
export const formatToolReturn = (result: RunToolReturn): FormattedToolReturn => {
  if (result.prompt) {
    return { ok: false, error: 'tool requires user interaction and cannot be run via bash' };
  }

  const results = result.results ?? [];

  const errors = results.filter(isErrorResult);
  if (errors.length > 0) {
    return { ok: false, error: errors.map((r) => r.data.message).join('; ') };
  }

  if (results.length === 1) {
    return { ok: true, value: results[0].data };
  }

  return { ok: true, value: results.map((r) => r.data) };
};
