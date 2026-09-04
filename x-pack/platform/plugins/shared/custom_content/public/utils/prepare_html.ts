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
 * Two rules are `!important`, both because they are ours rather than the template's: the body
 * background and the reduced-motion guard.
 * Both stay escapable on purpose — redefining the token, or an author `!important`, wins. These
 * only need to be unbypassable by accident.
 *
 * The guard is enforced here rather than asked for in the prompt because a generated template
 * cannot be relied on to wrap its own keyframes — and the templates most likely to animate are the
 * long, complex ones, which are exactly where prompt rules decay first. EUI's own idiom is the
 * opposite polarity (`euiCanAnimate`, i.e. opt in under `no-preference`), which is the better
 * pattern when you control the CSS; overriding CSS we did not write needs the opt-out form.
 */
const BASE_STYLES = `
body{margin:0;padding:var(--cc-space-l);box-sizing:border-box;font-family:var(--cc-font-family);color:var(--cc-color-text)}
*,*::before,*::after{box-sizing:inherit}
body{background:var(--cc-color-background)!important}
@media screen and (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

export function buildThemeCss(
  euiTheme: EuiThemeComputed,
  colorMode: EuiThemeColorModeStandard
): string {
  const isDark = colorMode === 'DARK';
  const c = euiTheme.colors;
  // A token whose theme value is missing is dropped rather than defaulted: a hardcoded fallback here
  // is a second copy of an EUI value that silently goes stale, which is the drift the tokens exist
  // to avoid. A dropped token makes `var()` resolve to the property's initial value instead.
  const vars: Array<[string, string | number | undefined]> = [
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
    ['--cc-radius', t.border.radius.medium],
    ['--cc-radius-s', t.border.radius.small],
    ['--cc-font-family', t.font.family],
    ['--cc-motion-fast', t.animation.fast],
    ['--cc-motion-normal', t.animation.normal],
    ['--cc-motion-slow', t.animation.slow],
    ['--cc-ease', t.animation.resistance]
  );

  // This is EUI's own colorblind-safe visualization palette.
  euiPaletteColorBlind().forEach((color, index) => {
    vars.push([`--cc-vis-${index}`, color]);
  });

  const declarations = vars
    .filter((entry): entry is [string, string | number] => entry[1] != null)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  return `:root{${declarations}}${BASE_STYLES}`;
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
