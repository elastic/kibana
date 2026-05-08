/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dispatchToolCall } from './tools';

describe('dispatchToolCall', () => {
  const baseDeps = {
    api: {} as any,
    spaceId: 'default',
    request: {} as any,
  };

  it('replaces YAML on set_yaml', async () => {
    const result = await dispatchToolCall(
      { yaml: '' },
      { toolCallId: 't1', toolName: 'set_yaml', args: { yaml: 'name: foo\nversion: "1"\n' } },
      baseDeps
    );

    expect(result.yaml).toBe('name: foo\nversion: "1"\n');
    expect(result.message.success).toBe(true);
  });

  it('returns an error when insert_step is called on empty YAML', async () => {
    const result = await dispatchToolCall(
      { yaml: '' },
      {
        toolCallId: 't1',
        toolName: 'insert_step',
        args: { step: { name: 's1', type: 'console', with: { message: 'hi' } } },
      },
      baseDeps
    );

    expect(result.yaml).toBeUndefined();
    expect(result.message.success).toBe(false);
    expect(result.message.error).toMatch(/parse|root|empty|mapping/i);
  });

  it('inserts a step into existing YAML', async () => {
    const initial = `name: demo\nversion: "1"\ntriggers:\n  - type: manual\nsteps:\n  - name: a\n    type: console\n    with:\n      message: hi\n`;
    const result = await dispatchToolCall(
      { yaml: initial },
      {
        toolCallId: 't1',
        toolName: 'insert_step',
        args: { step: { name: 'b', type: 'console', with: { message: 'bye' } } },
      },
      baseDeps
    );

    expect(result.message.success).toBe(true);
    expect(result.yaml).toContain('name: b');
    expect(result.yaml).toContain('name: a');
  });

  it('rejects unknown tool names', async () => {
    const result = await dispatchToolCall(
      { yaml: '' },
      { toolCallId: 't1', toolName: 'definitely_not_a_tool', args: {} },
      baseDeps
    );

    expect(result.message.success).toBe(false);
    expect(result.message.error).toMatch(/unknown tool/i);
  });
});
