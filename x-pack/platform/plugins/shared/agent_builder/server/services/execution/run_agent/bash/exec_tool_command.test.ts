/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { Bash } from 'just-bash';
import {
  createExecToolCommand,
  type ExecToolFn,
  type ResolveToolIdFn,
  type GetToolSchemaFn,
} from './exec_tool_command';

const identityResolve: ResolveToolIdFn = (id) => id;
const emptySchema: GetToolSchemaFn = () => z.object({});

const runScript = async (
  script: string,
  execToolFn: ExecToolFn,
  resolve: ResolveToolIdFn = identityResolve,
  getToolSchema: GetToolSchemaFn = emptySchema
) => {
  const cmd = createExecToolCommand({ execToolFn, resolveToolId: resolve, getToolSchema });
  const bash = new Bash({ customCommands: [cmd] });
  return bash.exec(script);
};

describe('exec_tool command', () => {
  it('prints the unwrapped result data to stdout on success', async () => {
    const fn: ExecToolFn = jest.fn().mockResolvedValue({
      results: [{ tool_result_id: 'r1', type: 'other', data: { ok: true } }],
    });
    const result = await runScript('exec_tool foo --args=\'{"x":1}\'', fn);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(JSON.stringify({ ok: true }));
    expect(fn).toHaveBeenCalledWith('foo', { x: 1 });
  });

  it('exits 1 with stderr when the tool returns an error result', async () => {
    const fn: ExecToolFn = jest.fn().mockResolvedValue({
      results: [{ tool_result_id: 'e1', type: 'error', data: { message: 'kaboom' } }],
    });
    const result = await runScript('exec_tool foo', fn);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/kaboom/);
  });

  it('runs the tool with no args when --args is omitted', async () => {
    const fn: ExecToolFn = jest.fn().mockResolvedValue({ results: [] });
    await runScript('exec_tool bar', fn);
    expect(fn).toHaveBeenCalledWith('bar', undefined);
  });

  it('resolves sanitized → internal IDs via resolveToolId', async () => {
    const fn: ExecToolFn = jest.fn().mockResolvedValue({ results: [] });
    const resolve: ResolveToolIdFn = jest.fn((id) => (id === 'sanitized' ? 'internal.id' : id));
    await runScript('exec_tool sanitized', fn, resolve);
    expect(fn).toHaveBeenCalledWith('internal.id', undefined);
  });

  it('exits 1 with stderr on tool execution error', async () => {
    const fn: ExecToolFn = jest.fn().mockRejectedValue(new Error('boom'));
    const result = await runScript('exec_tool bad', fn);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/boom/);
  });

  it('exits 1 with stderr on malformed JSON args', async () => {
    const fn: ExecToolFn = jest.fn();
    const result = await runScript("exec_tool foo --args='{not json'", fn);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/JSON/);
    expect(fn).not.toHaveBeenCalled();
  });

  it('exits 1 when no tool_id is given', async () => {
    const fn: ExecToolFn = jest.fn();
    const result = await runScript('exec_tool', fn);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toLowerCase()).toMatch(/tool/);
  });
});

const toolSchema = (): GetToolSchemaFn => () =>
  z.object({
    query: z.string(),
    limit: z.number().optional(),
    verbose: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
    opts: z.object({ a: z.number() }).optional(),
  });

describe('individual --param flags', () => {
  it('parses --key=value and coerces via schema', async () => {
    const fn: ExecToolFn = jest.fn().mockResolvedValue({ results: [] });
    await runScript('exec_tool foo --query=hello --limit=5', fn, identityResolve, toolSchema());
    expect(fn).toHaveBeenCalledWith('foo', { query: 'hello', limit: 5 });
  });

  it('parses the two-token --key value form', async () => {
    const fn: ExecToolFn = jest.fn().mockResolvedValue({ results: [] });
    await runScript('exec_tool foo --query hello --limit 5', fn, identityResolve, toolSchema());
    expect(fn).toHaveBeenCalledWith('foo', { query: 'hello', limit: 5 });
  });

  it('coerces booleans, arrays and objects', async () => {
    const fn: ExecToolFn = jest.fn().mockResolvedValue({ results: [] });
    await runScript(
      `exec_tool foo --verbose=true --tags='["a","b"]' --opts='{"a":1}'`,
      fn,
      identityResolve,
      toolSchema()
    );
    expect(fn).toHaveBeenCalledWith('foo', { verbose: true, tags: ['a', 'b'], opts: { a: 1 } });
  });

  it('treats a bare boolean flag as true', async () => {
    const fn: ExecToolFn = jest.fn().mockResolvedValue({ results: [] });
    await runScript('exec_tool foo --verbose', fn, identityResolve, toolSchema());
    expect(fn).toHaveBeenCalledWith('foo', { verbose: true });
  });

  it('errors on a bare flag for a non-boolean field', async () => {
    const fn: ExecToolFn = jest.fn();
    const result = await runScript('exec_tool foo --query', fn, identityResolve, toolSchema());
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/requires a value/);
    expect(fn).not.toHaveBeenCalled();
  });

  it('lets individual params override --args on conflict', async () => {
    const fn: ExecToolFn = jest.fn().mockResolvedValue({ results: [] });
    await runScript(
      `exec_tool foo --args='{"query":"hi","limit":1}' --limit=5`,
      fn,
      identityResolve,
      toolSchema()
    );
    expect(fn).toHaveBeenCalledWith('foo', { query: 'hi', limit: 5 });
  });

  it('falls back to JSON-then-string for keys not in the schema', async () => {
    const fn: ExecToolFn = jest.fn().mockResolvedValue({ results: [] });
    await runScript('exec_tool foo --unknown=7 --other=raw', fn, identityResolve, toolSchema());
    expect(fn).toHaveBeenCalledWith('foo', { unknown: 7, other: 'raw' });
  });

  it('errors on a non-numeric value for a number field', async () => {
    const fn: ExecToolFn = jest.fn();
    const result = await runScript('exec_tool foo --limit=abc', fn, identityResolve, toolSchema());
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/number/);
    expect(fn).not.toHaveBeenCalled();
  });

  it('errors on invalid JSON for an array field', async () => {
    const fn: ExecToolFn = jest.fn();
    const result = await runScript(
      `exec_tool foo --tags='[bad'`,
      fn,
      identityResolve,
      toolSchema()
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/JSON/);
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not invoke getToolSchema when no individual params are present', async () => {
    const fn: ExecToolFn = jest.fn().mockResolvedValue({ results: [] });
    const getSchema = jest.fn(toolSchema());
    await runScript(`exec_tool foo --args='{"query":"hi"}'`, fn, identityResolve, getSchema);
    expect(getSchema).not.toHaveBeenCalled();
    expect(fn).toHaveBeenCalledWith('foo', { query: 'hi' });
  });
});
