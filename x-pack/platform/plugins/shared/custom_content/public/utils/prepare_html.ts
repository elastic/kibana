/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DOMPurify from 'dompurify';
import type { EuiThemeColorModeStandard, EuiThemeComputed } from '@elastic/eui';
import { euiPaletteColorBlind } from '@elastic/eui';
import { CUSTOM_CONTENT_CSP_META } from '../../common/constants';

export function injectCsp(html: string, colorMode?: EuiThemeColorModeStandard): string {
  if (html.includes(CUSTOM_CONTENT_CSP_META)) return html;
  const colorSchemeMeta = `<meta name="color-scheme" content="${
    colorMode === 'DARK' ? 'dark' : 'light'
  }">`;
  const inject = CUSTOM_CONTENT_CSP_META + colorSchemeMeta;
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return html.slice(0, at) + inject + html.slice(at);
  }
  return inject + html;
}

export function injectStyleTag(html: string, style: string): string {
  const styleTag = `<style>${style}</style>`;
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return html.slice(0, at) + styleTag + html.slice(at);
  }
  return styleTag + html;
}

/**
 * Minimal baseline for the sandboxed iframe: background, font and text color, plus the margin and
 * box-sizing reset those imply.
 *
 * Emitted *before* any template CSS (`injectStyleTag` inserts at the top of `<head>`), so an author
 * or generated rule of equal specificity wins. A floor, not a lock-in — never append this after the
 * template's own styles.
 *
 * Deliberately does not style headings, tables or lists. Those are the template's business; the
 * point here is only that a panel with no CSS of its own does not render as a bare browser
 * document. Everything is a token, so it tracks the theme without reading it.
 *
 * The body background is the sole `!important`. Generated templates set `background: #0d1117` and
 * similar despite the prompt forbidding it, which renders the whole panel as a dark slab for every
 * light-mode user. Nothing else is locked.
 */
const BASE_STYLES = `
body{margin:0;padding:var(--cc-space-l);box-sizing:border-box;font-family:var(--cc-font-family);color:var(--cc-color-text)}
*,*::before,*::after{box-sizing:inherit}
body{background:var(--cc-color-background)!important}
`;

export function buildThemeCss(
  euiTheme: EuiThemeComputed,
  colorMode: EuiThemeColorModeStandard
): string {
  const isDark = colorMode === 'DARK';
  const c = euiTheme.colors;
  const vars: Array<[string, string]> = [
    ['--cc-color-text', c.textParagraph],
    ['--cc-color-background', isDark ? c.emptyShade : 'transparent'],
    ['--cc-color-surface', isDark ? c.lightestShade : c.emptyShade],
    ['--cc-color-primary', c.primary],
    ['--cc-color-accent', c.accentSecondary],
    ['--cc-color-accent-2', c.accent],
    ['--cc-color-warning', c.warning],
    ['--cc-color-danger', c.danger],
    ['--cc-color-border', c.borderBasePlain],
  ];
  // Spacing, radius and type come from the same theme as the colors so generated markup can match
  // EUI's rhythm without the prompt hardcoding pixel values that drift when EUI changes.
  const t = euiTheme;
  vars.push(
    ['--cc-space-xs', t.size.xs],
    ['--cc-space-s', t.size.s],
    ['--cc-space-m', t.size.m],
    ['--cc-space-l', t.size.base],
    ['--cc-space-xl', t.size.l],
    ['--cc-radius', String(t.border.radius.medium ?? '6px')],
    ['--cc-radius-s', String(t.border.radius.small ?? '4px')],
    ['--cc-font-family', t.font.family]
  );

  // This is EUI's own colorblind-safe visualization palette.
  euiPaletteColorBlind().forEach((color, index) => {
    vars.push([`--cc-vis-${index}`, color]);
  });

  return `:root{${vars.map(([k, v]) => `${k}:${v}`).join(';')}}${BASE_STYLES}`;
}

export function applyHtmlTheme(
  html: string,
  colorMode: EuiThemeColorModeStandard,
  euiTheme: EuiThemeComputed
): string {
  // CSP is injected last so the meta tag precedes every other node in <head>. A meta CSP only
  // governs resources fetched after it is parsed, so anything inserted ahead of it is ungoverned.
  return injectCsp(injectStyleTag(html, buildThemeCss(euiTheme, colorMode)), colorMode);
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['a'],
    WHOLE_DOCUMENT: true,
    FORCE_BODY: false,
  });
}
