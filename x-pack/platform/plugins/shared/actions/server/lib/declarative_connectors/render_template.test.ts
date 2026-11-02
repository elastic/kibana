/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderTemplateValue } from './render_template';

const context = {
  input: {
    flag: false,
    count: 90,
    tags: ['a', 'b'],
    ip: '1.2.3.4',
    keep: 'yes',
    nested: { city: 'Austin' },
  },
  config: { baseUrl: 'https://api.example' },
};

describe('renderTemplateValue', () => {
  it('returns the raw value for an exact template', () => {
    expect(renderTemplateValue('{{ input.flag }}', context)).toBe(false);
    expect(renderTemplateValue('{{ input.count }}', context)).toBe(90);
    expect(renderTemplateValue('{{ input.tags }}', context)).toEqual(['a', 'b']);
  });

  it('stringifies embedded templates', () => {
    expect(renderTemplateValue('ip {{ input.ip }}', context)).toBe('ip 1.2.3.4');
    expect(renderTemplateValue('n={{ input.count }}', context)).toBe('n=90');
  });

  it('drops undefined object entries', () => {
    expect(
      renderTemplateValue(
        { keep: '{{ input.keep }}', drop: '{{ input.missing }}' },
        context
      )
    ).toEqual({ keep: 'yes' });
  });

  it('renders nested objects', () => {
    expect(
      renderTemplateValue(
        { outer: { inner: '{{ config.baseUrl }}', city: '{{ input.nested.city }}' } },
        context
      )
    ).toEqual({ outer: { inner: 'https://api.example', city: 'Austin' } });
  });
});
