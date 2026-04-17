/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { markdownToMrkdwn } from './slack_format';

describe('markdownToMrkdwn', () => {
  describe('bold', () => {
    it('converts **text** to *text*', () => {
      expect(markdownToMrkdwn('**hello**')).toBe('*hello*');
    });

    it('converts __text__ to *text*', () => {
      expect(markdownToMrkdwn('__hello__')).toBe('*hello*');
    });
  });

  describe('headers', () => {
    it('converts h1 to bold', () => {
      expect(markdownToMrkdwn('# Title')).toBe('*Title*');
    });

    it('converts h3 to bold', () => {
      expect(markdownToMrkdwn('### Section')).toBe('*Section*');
    });
  });

  describe('strikethrough', () => {
    it('converts ~~text~~ to ~text~', () => {
      expect(markdownToMrkdwn('~~removed~~')).toBe('~removed~');
    });
  });

  describe('links', () => {
    it('converts [label](url) to <url|label>', () => {
      expect(markdownToMrkdwn('[Elastic](https://elastic.co)')).toBe(
        '<https://elastic.co|Elastic>'
      );
    });

    it('converts images to Slack format', () => {
      expect(markdownToMrkdwn('![alt](https://example.com/img.png)')).toBe(
        '<https://example.com/img.png|alt>'
      );
    });
  });

  describe('code blocks', () => {
    it('strips language tag from fenced code blocks', () => {
      const input = '```typescript\nconst x = 1;\n```';
      expect(markdownToMrkdwn(input)).toBe('```\nconst x = 1;\n```');
    });

    it('preserves inline code unchanged', () => {
      expect(markdownToMrkdwn('use `const` here')).toBe('use `const` here');
    });

    it('does not convert bold inside code blocks', () => {
      const input = '```\n**not bold**\n```';
      expect(markdownToMrkdwn(input)).toBe('```\n**not bold**\n```');
    });
  });

  describe('tables', () => {
    it('converts a markdown table to a monospace code block', () => {
      const input = '| A | B |\n| - | - |\n| 1 | 2 |';
      const result = markdownToMrkdwn(input);
      expect(result).toMatch(/^```/);
      expect(result).toContain('A');
      expect(result).toContain('B');
      expect(result).toContain('1');
      expect(result).toContain('2');
      expect(result).not.toContain('| - |');
    });
  });

  describe('horizontal rules', () => {
    it('removes horizontal rules', () => {
      const input = 'above\n---\nbelow';
      expect(markdownToMrkdwn(input)).toBe('above\n\nbelow');
    });
  });

  describe('blank lines', () => {
    it('collapses 3+ blank lines to 2', () => {
      const input = 'a\n\n\n\nb';
      expect(markdownToMrkdwn(input)).toBe('a\n\nb');
    });
  });

  describe('passthrough', () => {
    it('returns plain text unchanged', () => {
      expect(markdownToMrkdwn('hello world')).toBe('hello world');
    });

    it('trims leading and trailing whitespace', () => {
      expect(markdownToMrkdwn('  hello  ')).toBe('hello');
    });
  });
});
