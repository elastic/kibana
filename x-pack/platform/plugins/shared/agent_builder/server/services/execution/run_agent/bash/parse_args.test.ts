/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExecToolArgs } from './parse_args';

describe('parseExecToolArgs', () => {
  it('errors when no tool id is given', () => {
    expect(parseExecToolArgs([])).toEqual({ error: 'exec_tool: missing tool id argument' });
  });

  it('parses a bare tool id with no flags', () => {
    expect(parseExecToolArgs(['foo'])).toEqual({ toolId: 'foo', argsRaw: undefined, params: [] });
  });

  it('parses --args=<json>', () => {
    const parsed = parseExecToolArgs(['foo', '--args={"x":1}']);
    expect(parsed).toMatchObject({ toolId: 'foo', argsRaw: '{"x":1}', params: [] });
  });

  it('parses the two-token --args <json> form', () => {
    const parsed = parseExecToolArgs(['foo', '--args', '{"x":1}']);
    expect(parsed).toMatchObject({ toolId: 'foo', argsRaw: '{"x":1}', params: [] });
  });

  it('errors when --args has no value', () => {
    expect(parseExecToolArgs(['foo', '--args'])).toMatchObject({
      error: expect.stringMatching(/--args requires a value/),
    });
    expect(parseExecToolArgs(['foo', '--args', '--other=1'])).toMatchObject({
      error: expect.stringMatching(/--args requires a value/),
    });
  });

  it('parses --key=value params', () => {
    const parsed = parseExecToolArgs(['foo', '--query=hello', '--limit=5']);
    expect(parsed.params).toEqual([
      { key: 'query', value: 'hello' },
      { key: 'limit', value: '5' },
    ]);
  });

  it('parses the two-token --key value form', () => {
    const parsed = parseExecToolArgs(['foo', '--query', 'hello', '--limit', '5']);
    expect(parsed.params).toEqual([
      { key: 'query', value: 'hello' },
      { key: 'limit', value: '5' },
    ]);
  });

  it('records a bare flag as an undefined value', () => {
    const parsed = parseExecToolArgs(['foo', '--verbose']);
    expect(parsed.params).toEqual([{ key: 'verbose', value: undefined }]);
  });

  it('treats a flag immediately followed by another flag as bare', () => {
    const parsed = parseExecToolArgs(['foo', '--verbose', '--query=hi']);
    expect(parsed.params).toEqual([
      { key: 'verbose', value: undefined },
      { key: 'query', value: 'hi' },
    ]);
  });

  it('mixes --args with individual params', () => {
    const parsed = parseExecToolArgs(['foo', '--args={"x":1}', '--limit=5']);
    expect(parsed).toMatchObject({
      toolId: 'foo',
      argsRaw: '{"x":1}',
      params: [{ key: 'limit', value: '5' }],
    });
  });

  it('errors on an empty flag name', () => {
    expect(parseExecToolArgs(['foo', '--=x'])).toMatchObject({
      error: expect.stringMatching(/invalid flag/),
    });
    expect(parseExecToolArgs(['foo', '--'])).toMatchObject({
      error: expect.stringMatching(/invalid flag/),
    });
  });

  it('errors on an unexpected non-flag argument', () => {
    expect(parseExecToolArgs(['foo', 'bar'])).toMatchObject({
      error: expect.stringMatching(/unexpected argument 'bar'/),
    });
  });
});
