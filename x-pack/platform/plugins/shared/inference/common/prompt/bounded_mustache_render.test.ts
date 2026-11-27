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
  describe('normal rendering', () => {
    it('renders a simple template', () => {
      expect(renderBoundedMustache('Hello {{name}}', { name: 'world' })).toBe('Hello world');
    });

    it('renders a section over an array', () => {
      expect(renderBoundedMustache('{{#items}}{{.}} {{/items}}', { items: [1, 2, 3] })).toBe(
        '1 2 3 '
      );
    });

    it('renders an empty string for a missing optional field rather than throwing', () => {
      expect(renderBoundedMustache('a{{missing}}b', {})).toBe('ab');
      expect(renderBoundedMustache('a{{{missing}}}b', {})).toBe('ab');
      expect(renderBoundedMustache('a{{missing}}b', { missing: null })).toBe('ab');
    });

    it('renders non-string values by coercing them, like Mustache does', () => {
      expect(renderBoundedMustache('{{{n}}}', { n: 42 })).toBe('42');
      expect(renderBoundedMustache('{{{list}}}', { list: [1, 2, 3] })).toBe('1,2,3');
    });
  });

  describe('work (operations) limit', () => {
    // Small depth + small budget: this trips the budget, but also finishes on its own if the
    // budget were removed, so a broken guard cannot hang the Jest worker.
    it('rejects an exponentially expanding nested-section template', () => {
      expect(() =>
        renderBoundedMustache(nestedSections(10), { a: [{}, {}] }, { maxOperations: 50 })
      ).toThrow(MustacheRenderLimitError);
    });

    it('charges for iterating a section over an array even when the body emits nothing', () => {
      const a = Array.from({ length: 100 }, () => ({}));
      expect(() => renderBoundedMustache('{{#a}}{{/a}}', { a }, { maxOperations: 20 })).toThrow(
        MustacheRenderLimitError
      );
    });
  });

  describe('depth limit', () => {
    it('rejects deeply nested sections before a stack overflow, as a limit error', () => {
      expect(() =>
        renderBoundedMustache(nestedSections(5000), { a: {} }, { maxDepth: 100 })
      ).toThrow(MustacheRenderLimitError);
    });
  });

  describe('output length limit', () => {
    it('rejects a small template whose output exceeds the length budget', () => {
      const a = Array.from({ length: 100 }, () => ({ big: 'x'.repeat(50) }));
      expect(() =>
        renderBoundedMustache('{{#a}}{{{big}}}{{/a}}', { a }, { maxOutputLength: 500 })
      ).toThrow(MustacheRenderLimitError);
    });

    it('measures coerced non-string output so a number cannot disable the cap', () => {
      const a = Array.from({ length: 100 }, () => ({ n: 123456 }));
      expect(() =>
        renderBoundedMustache('{{#a}}{{{n}}}{{/a}}', { a }, { maxOutputLength: 100 })
      ).toThrow(MustacheRenderLimitError);
    });
  });
});
