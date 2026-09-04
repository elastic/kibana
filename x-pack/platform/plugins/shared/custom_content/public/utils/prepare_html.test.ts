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
    size: { xs: '4px', s: '8px', m: '12px', base: '16px', l: '24px' },
    border: { radius: { medium: '6px', small: '4px' } },
    font: {
      family: 'Inter, sans-serif',
    },
    animation: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      resistance: 'cubic-bezier(.32,.72,0,1)',
    },
  } as unknown as EuiThemeComputed;

  // A meta CSP only governs resources fetched after it is parsed, so it must precede the
  // theme <style> tag — otherwise CSS injected ahead of it would be ungoverned.
  // Without this a bare-markup template renders with browser defaults and reads as pasted in from
  // another product — the reason the feature was hidden.
  it('gives markup-only templates a themed baseline', () => {
    const result = applyHtmlTheme('<p>hello</p>', 'LIGHT', euiTheme);

    expect(result).toContain('font-family:var(--cc-font-family)');
    expect(result).toContain('padding:var(--cc-space-l)');
    expect(result).toContain('color:var(--cc-color-text)');
  });

  it('emits the baseline before the template so author CSS still wins', () => {
    const authored = '<html><head><style>body{padding:0}</style></head><body></body></html>';

    const result = applyHtmlTheme(authored, 'LIGHT', euiTheme);

    expect(result.indexOf('--cc-space-l')).toBeLessThan(result.indexOf('body{padding:0}'));
  });

  // Everything else in the baseline is a floor the template can override. These two are not, so
  // the count is pinned: a third `!important` should be a deliberate decision, not a drive-by.
  it('locks the body background and the reduced-motion guard, and nothing else', () => {
    const result = applyHtmlTheme('<p>hello</p>', 'LIGHT', euiTheme);

    expect(result).toContain('body{background:var(--cc-color-background)!important}');
    expect(result).toContain(
      '@media screen and (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}'
    );
    expect(result.match(/!important/g)).toHaveLength(3);
  });

  it('exposes the motion tokens', () => {
    const result = applyHtmlTheme('<p>hello</p>', 'LIGHT', euiTheme);

    expect(result).toContain('--cc-motion-fast:150ms');
    expect(result).toContain('--cc-ease:cubic-bezier(.32,.72,0,1)');
  });

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

  // Pins the light/dark branch in `buildThemeCss`. Inverting it would paint a dark background in
  // light mode, and no other test would catch it — every other case here runs in LIGHT.
  it('resolves the background variable per theme', () => {
    const markup = '<html><head></head><body></body></html>';

    expect(applyHtmlTheme(markup, 'LIGHT', euiTheme)).toContain(
      '--cc-color-background:transparent'
    );

    const dark = applyHtmlTheme(markup, 'DARK', euiTheme);
    expect(dark).toContain('--cc-color-background:#fff');
    expect(dark).not.toContain('--cc-color-background:transparent');
  });

  it('sets the color-scheme meta per theme', () => {
    expect(applyHtmlTheme('<p>hi</p>', 'DARK', euiTheme)).toContain('content="dark"');
    expect(applyHtmlTheme('<p>hi</p>', 'LIGHT', euiTheme)).toContain('content="light"');
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
