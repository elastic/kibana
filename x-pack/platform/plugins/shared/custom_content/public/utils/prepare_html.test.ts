/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { applyHtmlTheme, injectCsp, injectStyleTag, sanitizeHtml } from './prepare_html';

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

describe('applyHtmlTheme', () => {
  const euiTheme = {
    colors: {
      textParagraph: '#111',
      emptyShade: '#fff',
      lightestShade: '#eee',
      primary: '#06c',
      accentSecondary: '#0a8',
      accent: '#e6a',
      warning: '#fc0',
      danger: '#b00',
      borderBasePlain: '#ccc',
    },
  } as unknown as EuiThemeComputed;

  // A meta CSP only governs resources fetched after it is parsed, so it must precede the
  // theme <style> tag — otherwise CSS injected ahead of it would be ungoverned.
  it('places the CSP meta before the injected theme style tag', () => {
    const result = applyHtmlTheme('<html><head></head><body></body></html>', 'LIGHT', euiTheme);
    expect(result.indexOf('Content-Security-Policy')).toBeLessThan(result.indexOf('<style>'));
  });

  it('places the CSP meta first when there is no <head>', () => {
    const result = applyHtmlTheme('<p>hello</p>', 'LIGHT', euiTheme);
    expect(result.startsWith('<meta http-equiv="Content-Security-Policy"')).toBe(true);
    expect(result.indexOf('Content-Security-Policy')).toBeLessThan(result.indexOf('<style>'));
  });

  it('still injects the theme CSS custom properties', () => {
    const result = applyHtmlTheme('<html><head></head><body></body></html>', 'LIGHT', euiTheme);
    expect(result).toContain('--cc-color-text:#111');
    expect(result).toContain('--cc-color-border:#ccc');
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
