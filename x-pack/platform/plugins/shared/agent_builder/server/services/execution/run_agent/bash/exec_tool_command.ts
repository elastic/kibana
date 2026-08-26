/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomCommand } from 'just-bash';
import { defineCommand } from 'just-bash';
import type { ZodObject } from '@kbn/zod/v4';
import type { MaybePromise } from '@kbn/utility-types';
import type { RunToolReturn } from '@kbn/agent-builder-server/runner';
import { parseExecToolArgs } from './parse_args';
import { coerceParamValue } from './param_coercion';
import { formatToolReturn } from './format_tool_return';

export type ExecToolFn = (toolId: string, args: unknown) => Promise<RunToolReturn>;
export type ResolveToolIdFn = (toolId: string) => string;
export type GetToolSchemaFn = (resolvedToolId: string) => MaybePromise<ZodObject<any>>;

export interface BashToolAccess {
  execToolFn: ExecToolFn;
  resolveToolId: ResolveToolIdFn;
  getToolSchema: GetToolSchemaFn;
}

export const createExecToolCommand = ({
  execToolFn,
  resolveToolId,
  getToolSchema,
}: BashToolAccess): CustomCommand => {
  return defineCommand('exec_tool', async (argv) => {
    const parsed = parseExecToolArgs(argv);
    if (parsed.error) {
      return fail(parsed.error);
    }
    const { toolId, argsRaw, params } = parsed;
    const resolvedToolId = resolveToolId(toolId!);

    // Parse the optional --args base object.
    let argsValue: unknown;
    if (argsRaw !== undefined) {
      try {
        argsValue = JSON.parse(argsRaw);
      } catch (err) {
        return fail(`exec_tool: invalid JSON for --args: ${(err as Error).message}`);
      }
    }

    const hasParams = params !== undefined && params.length > 0;

    let finalArgs: unknown = argsValue;

    if (hasParams) {
      // --args must be an object when merging individual params into it.
      if (
        argsRaw !== undefined &&
        (typeof argsValue !== 'object' || argsValue === null || Array.isArray(argsValue))
      ) {
        return fail(
          'exec_tool: --args must be a JSON object when combined with individual --params'
        );
      }

      let schema: ZodObject<any>;
      try {
        schema = await getToolSchema(resolvedToolId);
      } catch (err) {
        return fail(errMessage(err));
      }

      const base = (argsValue as Record<string, unknown>) ?? {};
      const coerced: Record<string, unknown> = {};
      for (const { key, value } of params!) {
        try {
          coerced[key] = coerceParamValue(schema, key, value);
        } catch (err) {
          return fail(errMessage(err));
        }
      }

      finalArgs = { ...base, ...coerced };
    }

    try {
      const result = await execToolFn(resolvedToolId, finalArgs);
      const formatted = formatToolReturn(result);
      return formatted.ok ? ok(formatted.value) : fail(`exec_tool: ${formatted.error}`);
    } catch (err) {
      return fail(errMessage(err));
    }
  });
};

const fail = (message: string, exitCode: number = 1) => ({
  stdout: '',
  stderr: `${message}\n`,
  exitCode,
});

const ok = (result: unknown) => ({
  stdout: `${JSON.stringify(result)}\n`,
  stderr: '',
  exitCode: 0,
});

const errMessage = (err: unknown) => `exec_tool: ${(err as Error).message ?? String(err)}`;
