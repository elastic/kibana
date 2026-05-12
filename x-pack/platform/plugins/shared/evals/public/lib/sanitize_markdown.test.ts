/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeSkillMarkdown, sanitizePlainText, sanitizeFrontmatter } from './sanitize_markdown';

describe('sanitizeSkillMarkdown', () => {
  describe('XSS Prevention', () => {
    it('should remove script tags', () => {
      const malicious = '# Title\n<script>alert("xss")</script>\nContent';
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('# Title');
    });

    it('should remove script tags with attributes', () => {
      const malicious = '<script src="evil.js" type="text/javascript"></script>';
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('evil.js');
    });

    it('should remove iframe tags', () => {
      const malicious = '<iframe src="http://evil.com"></iframe>';
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain('<iframe');
    });

    it('should remove event handlers', () => {
      const malicious = '<div onclick="alert(\'xss\')">Click</div>';
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain('onclick');
    });

    it('should remove onerror handlers', () => {
      const malicious = '<img src=x onerror="alert(\'xss\')">';
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain('onerror');
    });

    it('should neutralize javascript: protocol in href', () => {
      const jsProto = `${'java'}script`;
      const malicious = `<a href="${jsProto}:alert('xss')">Click</a>`;
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain(`${'java'}script:`);
      expect(sanitized).toContain('href="#"');
    });

    it('should neutralize data: protocol in href', () => {
      const malicious = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain('data:');
      expect(sanitized).toContain('href="#"');
    });

    it('should remove style tags', () => {
      const malicious = `<style>body { background: url("${'java'}script:alert(1)") }</style>`;
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain('<style>');
    });

    it('should remove base, meta, link tags', () => {
      const malicious = '<base href="http://evil.com"><meta http-equiv="refresh">';
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain('<base');
      expect(sanitized).not.toContain('<meta');
    });
  });

  describe('Safe Content Preservation', () => {
    it('should preserve headings', () => {
      const safe = '# H1\n## H2\n### H3';
      const sanitized = sanitizeSkillMarkdown(safe);
      expect(sanitized).toContain('# H1');
      expect(sanitized).toContain('## H2');
      expect(sanitized).toContain('### H3');
    });

    it('should preserve bold and italic', () => {
      const safe = '**Bold** and *italic* text';
      const sanitized = sanitizeSkillMarkdown(safe);
      expect(sanitized).toContain('**Bold**');
      expect(sanitized).toContain('*italic*');
    });

    it('should preserve code blocks', () => {
      const safe = '```javascript\nconst x = 1;\n```';
      const sanitized = sanitizeSkillMarkdown(safe);
      expect(sanitized).toContain('```javascript');
      expect(sanitized).toContain('const x = 1;');
    });

    it('should preserve safe links', () => {
      const safe = '<a href="https://example.com">Link</a>';
      const sanitized = sanitizeSkillMarkdown(safe);
      expect(sanitized).toContain('href="https://example.com"');
    });

    it('should preserve safe images', () => {
      const safe = '<img src="https://example.com/image.png" alt="Image">';
      const sanitized = sanitizeSkillMarkdown(safe);
      expect(sanitized).toContain('src="https://example.com/image.png"');
      expect(sanitized).toContain('alt="Image"');
    });

    it('should preserve lists', () => {
      const safe = '- Item 1\n- Item 2\n\n1. First\n2. Second';
      const sanitized = sanitizeSkillMarkdown(safe);
      expect(sanitized).toContain('Item 1');
      expect(sanitized).toContain('First');
    });
  });

  describe('Attribute Filtering', () => {
    it('should remove disallowed attributes', () => {
      const malicious = '<a href="http://example.com" onclick="alert(1)" data-evil="bad">Link</a>';
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('data-evil');
      expect(sanitized).toContain('href="http://example.com"');
    });

    it('should escape attribute values', () => {
      const malicious = '<a href="http://example.com?x=<script>">Link</a>';
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('Length Limiting', () => {
    it('should truncate very long content', () => {
      const veryLong = 'a'.repeat(150000);
      const sanitized = sanitizeSkillMarkdown(veryLong);
      expect(sanitized.length).toBeLessThan(110000);
      expect(sanitized).toContain('[Content truncated for safety]');
    });

    it('should respect custom maxLength', () => {
      const long = 'a'.repeat(2000);
      const sanitized = sanitizeSkillMarkdown(long, { maxLength: 1000 });
      expect(sanitized.length).toBeLessThan(1100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeSkillMarkdown('')).toBe('');
    });

    it('should handle undefined', () => {
      expect(sanitizeSkillMarkdown(undefined as unknown as string)).toBe('');
    });

    it('should handle null', () => {
      expect(sanitizeSkillMarkdown(null as unknown as string)).toBe('');
    });

    it('should handle mixed case tags', () => {
      const malicious = '<SCRIPT>alert(1)</SCRIPT>';
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain('SCRIPT');
      expect(sanitized).not.toContain('alert');
    });

    it('should handle malformed tags', () => {
      const malicious = '<script>alert(1)<script>';
      const sanitized = sanitizeSkillMarkdown(malicious);
      expect(sanitized).not.toContain('<script>');
    });
  });
});

describe('sanitizePlainText', () => {
  it('should escape HTML entities', () => {
    const text = '<script>alert("xss")</script>';
    const sanitized = sanitizePlainText(text);
    expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  it('should escape ampersands', () => {
    const text = 'A & B';
    const sanitized = sanitizePlainText(text);
    expect(sanitized).toBe('A &amp; B');
  });

  it('should truncate long text', () => {
    const long = 'a'.repeat(15000);
    const sanitized = sanitizePlainText(long);
    expect(sanitized.length).toBeLessThan(11000);
    expect(sanitized).toContain('...');
  });

  it('should handle empty string', () => {
    expect(sanitizePlainText('')).toBe('');
  });
});

describe('sanitizeFrontmatter', () => {
  it('should block eval()', () => {
    const malicious = 'name: Test\neval: eval("code")';
    expect(() => sanitizeFrontmatter(malicious)).toThrow('dangerous code execution');
  });

  it('should block require()', () => {
    const malicious = 'name: Test\ncode: require("fs")';
    expect(() => sanitizeFrontmatter(malicious)).toThrow('dangerous code execution');
  });

  it('should block import', () => {
    const malicious = 'name: Test\nimport: import("module")';
    expect(() => sanitizeFrontmatter(malicious)).toThrow('dangerous code execution');
  });

  it('should allow safe frontmatter', () => {
    const safe = 'name: My Skill\nversion: 1.0.0\nauthor: User';
    expect(() => sanitizeFrontmatter(safe)).not.toThrow();
  });
});
