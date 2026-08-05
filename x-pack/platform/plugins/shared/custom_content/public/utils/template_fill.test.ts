/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripMarkdownFences, containsScript, injectCsp, sanitizeHtml } from './template_fill';

describe('injectCsp', () => {
  it('injects CSP into an existing <head>', () => {
    const result = injectCsp('<html><head></head><body></body></html>');
    expect(result).toContain('<head><meta http-equiv="Content-Security-Policy"');
  });

  it('prepends CSP when there is no <head>', () => {
    const result = injectCsp('<p>hello</p>');
    expect(result.startsWith('<meta http-equiv="Content-Security-Policy"')).toBe(true);
  });

  it('is idempotent — does not double-inject', () => {
    const once = injectCsp('<p>hello</p>');
    const twice = injectCsp(once);
    expect(twice.split('Content-Security-Policy').length).toBe(2);
  });
});

describe('stripMarkdownFences', () => {
  it('strips leading ```html and trailing ```', () => {
    expect(stripMarkdownFences('```html\n<p>hi</p>\n```')).toBe('<p>hi</p>');
  });

  it('strips fences embedded inside an HTML shell', () => {
    const raw = '<html><body>```html\n<p>hi</p>\n```</body></html>';
    expect(stripMarkdownFences(raw)).not.toContain('```');
  });

  it('leaves plain HTML unchanged', () => {
    expect(stripMarkdownFences('<p>hello</p>')).toBe('<p>hello</p>');
  });

  it('leaves a fenced code example deep in the body untouched', () => {
    const filler = '<p>content</p>'.repeat(30);
    const raw = `<html><body>${filler}<pre>Use \`\`\`bash\necho hi\n\`\`\` in your terminal</pre>${filler}</body></html>`;
    const result = stripMarkdownFences(raw);
    expect(result).toContain('```bash');
    expect(result).toContain('echo hi');
  });
});

describe('containsScript', () => {
  it('detects a script tag regardless of case or attributes', () => {
    expect(containsScript('<div></div><script>doStuff()</script>')).toBe(true);
    expect(containsScript('<SCRIPT type="application/json">{}</SCRIPT>')).toBe(true);
  });

  it('returns false for markup with no script tag', () => {
    expect(containsScript('<div class="script-like">no actual script here</div>')).toBe(false);
  });
});

describe('sanitizeHtml', () => {
  it('strips inline event handlers', () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
  });

  it('removes <a> tags (FORBID_TAGS config)', () => {
    const result = sanitizeHtml('<p>hello</p><a href="https://example.com">click</a>');
    expect(result).not.toContain('<a');
    expect(result).toContain('hello');
  });

  it('leaves safe HTML unchanged', () => {
    const safe = '<div class="card"><p>hello</p></div>';
    expect(sanitizeHtml(safe)).toContain('hello');
  });
});
