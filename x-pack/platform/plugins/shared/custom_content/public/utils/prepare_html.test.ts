/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectCsp, injectStyleTag, sanitizeHtml } from './prepare_html';

describe('injectStyleTag', () => {
  it('injects a <style> tag after <head>', () => {
    const result = injectStyleTag('<html><head></head><body></body></html>', ':root{--x:red}');
    expect(result).toContain('<head><style>:root{--x:red}</style>');
  });

  it('prepends when there is no <head>', () => {
    const result = injectStyleTag('<p>hello</p>', ':root{--x:red}');
    expect(result.startsWith('<style>:root{--x:red}</style>')).toBe(true);
  });
});

describe('injectCsp', () => {
  it('injects CSP and color-scheme meta into an existing <head>', () => {
    const result = injectCsp('<html><head></head><body></body></html>', 'DARK');
    expect(result).toContain('<head><meta http-equiv="Content-Security-Policy"');
    expect(result).toContain('color-scheme" content="dark"');
  });

  it('uses light color-scheme by default', () => {
    const result = injectCsp('<p>hello</p>');
    expect(result).toContain('color-scheme" content="light"');
  });

  it('prepends CSP when there is no <head>', () => {
    const result = injectCsp('<p>hello</p>', 'LIGHT');
    expect(result.startsWith('<meta http-equiv="Content-Security-Policy"')).toBe(true);
  });

  it('is idempotent — does not double-inject', () => {
    const once = injectCsp('<p>hello</p>');
    const twice = injectCsp(once);
    expect(twice.split('Content-Security-Policy').length).toBe(2);
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
