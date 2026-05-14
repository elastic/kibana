/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAgentContext, parseAgentContext } from './agent_context';

describe('isAgentContext', () => {
  it('returns false for null', () => {
    expect(isAgentContext(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAgentContext(undefined)).toBe(false);
  });

  it('returns false for an array', () => {
    expect(isAgentContext([])).toBe(false);
  });

  it('returns false for a string primitive', () => {
    expect(isAgentContext('foo')).toBe(false);
  });

  it('returns false for a number primitive', () => {
    expect(isAgentContext(42)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isAgentContext({})).toBe(false);
  });

  it('returns false when reasoning is missing', () => {
    expect(isAgentContext({ intended_tool: 'bar', intended_tool_args: {} })).toBe(false);
  });

  it('returns false when intended_tool is missing', () => {
    expect(isAgentContext({ reasoning: 'foo', intended_tool_args: {} })).toBe(false);
  });

  it('returns false when intended_tool_args is missing', () => {
    expect(isAgentContext({ reasoning: 'foo', intended_tool: 'bar' })).toBe(false);
  });

  it('returns false when reasoning is not a string', () => {
    expect(isAgentContext({ reasoning: 123, intended_tool: 'bar', intended_tool_args: {} })).toBe(
      false
    );
  });

  it('returns false when intended_tool is not a string', () => {
    expect(isAgentContext({ reasoning: 'foo', intended_tool: 42, intended_tool_args: {} })).toBe(
      false
    );
  });

  it('returns false when intended_tool_args is an array', () => {
    expect(isAgentContext({ reasoning: 'foo', intended_tool: 'bar', intended_tool_args: [] })).toBe(
      false
    );
  });

  it('returns false when intended_tool_args is not an object', () => {
    expect(
      isAgentContext({ reasoning: 'foo', intended_tool: 'bar', intended_tool_args: 'oops' })
    ).toBe(false);
  });

  it('returns true for a fully valid AgentContext', () => {
    expect(
      isAgentContext({
        reasoning: 'think carefully',
        intended_tool: 'my_tool',
        intended_tool_args: {},
      })
    ).toBe(true);
  });

  it('returns true for a fully valid AgentContext with populated intended_tool_args', () => {
    expect(
      isAgentContext({
        reasoning: 'think carefully',
        intended_tool: 'my_tool',
        intended_tool_args: { host: 'example.com', port: 443 },
      })
    ).toBe(true);
  });
});

describe('parseAgentContext', () => {
  it('returns undefined for null', () => {
    expect(parseAgentContext(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(parseAgentContext(undefined)).toBeUndefined();
  });

  it('returns undefined for an array', () => {
    expect(parseAgentContext([])).toBeUndefined();
  });

  it('returns undefined for a string primitive', () => {
    expect(parseAgentContext('hello')).toBeUndefined();
  });

  it('returns undefined for a number primitive', () => {
    expect(parseAgentContext(99)).toBeUndefined();
  });

  it('returns undefined for an empty object (missing required fields)', () => {
    expect(parseAgentContext({})).toBeUndefined();
  });

  it('returns undefined when reasoning is missing', () => {
    expect(parseAgentContext({ intended_tool: 'bar' })).toBeUndefined();
  });

  it('returns undefined when intended_tool is missing', () => {
    expect(parseAgentContext({ reasoning: 'foo' })).toBeUndefined();
  });

  it('returns undefined when reasoning is the wrong type', () => {
    expect(parseAgentContext({ reasoning: false, intended_tool: 'bar' })).toBeUndefined();
  });

  it('returns undefined when intended_tool is the wrong type', () => {
    expect(parseAgentContext({ reasoning: 'foo', intended_tool: [] })).toBeUndefined();
  });

  it('returns AgentContext with intended_tool_args defaulting to {} when absent', () => {
    expect(parseAgentContext({ reasoning: 'think', intended_tool: 'run' })).toEqual({
      intended_tool: 'run',
      intended_tool_args: {},
      reasoning: 'think',
    });
  });

  it('returns AgentContext with the provided intended_tool_args', () => {
    expect(
      parseAgentContext({
        intended_tool: 'run',
        intended_tool_args: { verbose: true, limit: 5 },
        reasoning: 'think',
      })
    ).toEqual({
      intended_tool: 'run',
      intended_tool_args: { limit: 5, verbose: true },
      reasoning: 'think',
    });
  });

  it('falls back to {} when intended_tool_args is an array', () => {
    expect(
      parseAgentContext({ reasoning: 'think', intended_tool: 'run', intended_tool_args: [] })
    ).toEqual({
      intended_tool: 'run',
      intended_tool_args: {},
      reasoning: 'think',
    });
  });

  it('falls back to {} when intended_tool_args is a non-object primitive', () => {
    expect(
      parseAgentContext({ reasoning: 'think', intended_tool: 'run', intended_tool_args: 'oops' })
    ).toEqual({
      intended_tool: 'run',
      intended_tool_args: {},
      reasoning: 'think',
    });
  });
});
