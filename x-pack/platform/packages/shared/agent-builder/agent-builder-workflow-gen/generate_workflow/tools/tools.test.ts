/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lookupStepDefinitions, lookupTriggerDefinitions } from './lookup';
import { dispatchToolCall } from './tools';

jest.mock('./lookup', () => ({
  lookupStepDefinitions: jest.fn(),
  lookupTriggerDefinitions: jest.fn(),
}));

const mockLookupStepDefinitions = lookupStepDefinitions as jest.MockedFunction<
  typeof lookupStepDefinitions
>;
const mockLookupTriggerDefinitions = lookupTriggerDefinitions as jest.MockedFunction<
  typeof lookupTriggerDefinitions
>;

describe('dispatchToolCall', () => {
  const baseDeps = {
    api: {} as any,
    spaceId: 'default',
    request: {} as any,
  };

  const twoStepYaml = `name: demo\nversion: "1"\ntriggers:\n  - type: manual\nsteps:\n  - name: a\n    type: console\n    with:\n      message: hi\n  - name: b\n    type: console\n    with:\n      message: bye\n`;

  beforeEach(() => {
    mockLookupStepDefinitions.mockReset();
    mockLookupTriggerDefinitions.mockReset();
  });

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

  it('replaces a step by name on modify_step', async () => {
    const result = await dispatchToolCall(
      { yaml: twoStepYaml },
      {
        toolCallId: 't1',
        toolName: 'modify_step',
        args: {
          stepName: 'a',
          updatedStep: { name: 'a', type: 'http', with: { url: 'https://example.com' } },
        },
      },
      baseDeps
    );

    expect(result.message.success).toBe(true);
    expect(result.yaml).toContain('type: http');
    expect(result.yaml).toContain('url: https://example.com');
    // step b is preserved
    expect(result.yaml).toContain('name: b');
  });

  it('returns an error from modify_step when the step name does not exist', async () => {
    const result = await dispatchToolCall(
      { yaml: twoStepYaml },
      {
        toolCallId: 't1',
        toolName: 'modify_step',
        args: {
          stepName: 'does_not_exist',
          updatedStep: { name: 'does_not_exist', type: 'console', with: { message: '!' } },
        },
      },
      baseDeps
    );

    expect(result.yaml).toBeUndefined();
    expect(result.message.success).toBe(false);
  });

  it('updates a single property on modify_step_property', async () => {
    const result = await dispatchToolCall(
      { yaml: twoStepYaml },
      {
        toolCallId: 't1',
        toolName: 'modify_step_property',
        args: { stepName: 'a', property: 'with.message', value: 'updated' },
      },
      baseDeps
    );

    expect(result.message.success).toBe(true);
    expect(result.yaml).toContain('message: updated');
    // step a's type is untouched, step b unchanged
    expect(result.yaml).toContain('name: a');
    expect(result.yaml).toContain('name: b');
  });

  it('removes a step by name on delete_step', async () => {
    const result = await dispatchToolCall(
      { yaml: twoStepYaml },
      { toolCallId: 't1', toolName: 'delete_step', args: { stepName: 'a' } },
      baseDeps
    );

    expect(result.message.success).toBe(true);
    expect(result.yaml).not.toContain('name: a');
    expect(result.yaml).toContain('name: b');
  });

  it('returns an error from delete_step when the step name does not exist', async () => {
    const result = await dispatchToolCall(
      { yaml: twoStepYaml },
      { toolCallId: 't1', toolName: 'delete_step', args: { stepName: 'nope' } },
      baseDeps
    );

    expect(result.yaml).toBeUndefined();
    expect(result.message.success).toBe(false);
  });

  it('delegates get_step_definitions to lookupStepDefinitions and surfaces its result', async () => {
    mockLookupStepDefinitions.mockResolvedValueOnce({ count: 0, stepTypes: [] });

    const result = await dispatchToolCall(
      { yaml: '' },
      {
        toolCallId: 't1',
        toolName: 'get_step_definitions',
        args: { search: 'slack' },
      },
      baseDeps
    );

    expect(mockLookupStepDefinitions).toHaveBeenCalledWith({ search: 'slack' }, baseDeps);
    expect(result.yaml).toBeUndefined();
    expect(result.message.success).toBe(true);
    expect(result.message.data).toEqual({ count: 0, stepTypes: [] });
  });

  it('delegates get_trigger_definitions to lookupTriggerDefinitions and surfaces its result', async () => {
    mockLookupTriggerDefinitions.mockResolvedValueOnce({ count: 1, triggerTypes: ['alert'] });

    const result = await dispatchToolCall(
      { yaml: '' },
      {
        toolCallId: 't1',
        toolName: 'get_trigger_definitions',
        args: { triggerType: 'alert' },
      },
      baseDeps
    );

    expect(mockLookupTriggerDefinitions).toHaveBeenCalledWith({ triggerType: 'alert' });
    expect(result.yaml).toBeUndefined();
    expect(result.message.success).toBe(true);
    expect(result.message.data).toEqual({ count: 1, triggerTypes: ['alert'] });
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

  it('rejects args that fail schema validation without invoking the handler', async () => {
    // set_yaml requires `args.yaml: string` — missing it would crash the
    // handler if dispatch didn't validate first.
    const result = await dispatchToolCall(
      { yaml: '' },
      { toolCallId: 't1', toolName: 'set_yaml', args: {} },
      baseDeps
    );

    expect(result.yaml).toBeUndefined();
    expect(result.message.success).toBe(false);
    expect(result.message.error).toMatch(/invalid arguments for set_yaml/i);
  });
});
