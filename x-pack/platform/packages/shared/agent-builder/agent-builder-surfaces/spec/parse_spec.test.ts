/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseSpec } from './parse_spec';

describe('parseSpec', () => {
  it('accepts a spec of markdown blocks', () => {
    const spec = {
      type: 'view',
      title: 'Open alerts',
      body: [
        { type: 'markdown', text: 'There are **3** open alerts.' },
        { type: 'markdown', text: '- one\n- two\n- three' },
      ],
    };

    expect(parseSpec(spec)).toEqual({ valid: true, spec });
  });

  it('rejects a spec without body nodes', () => {
    const result = parseSpec({ type: 'view', body: [] });

    expect(result.valid).toBe(false);
  });

  it('rejects an unknown node type with its path', () => {
    const result = parseSpec({ type: 'view', body: [{ type: 'chart', series: [] }] });

    expect(result).toEqual({
      valid: false,
      errors: [expect.stringContaining('body[0]')],
    });
  });

  it('rejects a markdown block without text', () => {
    const result = parseSpec({ type: 'view', body: [{ type: 'markdown' }] });

    expect(result).toEqual({
      valid: false,
      errors: [expect.stringContaining('body[0].text')],
    });
  });

  it('rejects unknown keys', () => {
    const result = parseSpec({
      type: 'view',
      body: [{ type: 'markdown', text: 'Hi', color: 'red' }],
    });

    expect(result).toEqual({
      valid: false,
      errors: [expect.stringContaining('color')],
    });
  });

  it('rejects a value that is not a spec', () => {
    expect(parseSpec('There are 3 open alerts.').valid).toBe(false);
  });
});
