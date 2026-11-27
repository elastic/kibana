/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderBoundedMustache } from './bounded_mustache_render';
import { MustacheRenderLimitError } from './mustache_render_limit_error';

const nestedSections = (depth: number): string => '{{#a}}'.repeat(depth) + '{{/a}}'.repeat(depth);

describe('renderBoundedMustache', () => {
  it('renders a normal template', () => {
    expect(renderBoundedMustache('Hello {{name}}', { name: 'world' })).toBe('Hello world');
  });

  it('renders sections over arrays', () => {
    expect(renderBoundedMustache('{{#items}}{{.}} {{/items}}', { items: [1, 2, 3] })).toBe(
      '1 2 3 '
    );
  });

  it('rejects a deeply nested section template that expands exponentially', () => {
    expect(() => renderBoundedMustache(nestedSections(30), { a: [{}, {}] })).toThrow(
      MustacheRenderLimitError
    );
  });

  it('rejects quickly rather than stalling on the exponential blow-up', () => {
    const start = Date.now();
    expect(() => renderBoundedMustache(nestedSections(40), { a: [{}, {}] })).toThrow(
      MustacheRenderLimitError
    );
    // An unbounded render at this depth would take days.
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it('rejects a shallow section over a very large array', () => {
    const a = Array.from({ length: 2_000_000 }, () => ({}));
    expect(() => renderBoundedMustache('{{#a}}{{#a}}x{{/a}}{{/a}}', { a })).toThrow(
      MustacheRenderLimitError
    );
  });

  it('rejects a template whose output exceeds the length budget', () => {
    const big = 'x'.repeat(100_000);
    const a = Array.from({ length: 100 }, () => ({ big }));
    expect(() => renderBoundedMustache('{{#a}}{{{big}}}{{/a}}', { a })).toThrow(
      MustacheRenderLimitError
    );
  });
});
