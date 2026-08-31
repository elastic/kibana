/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DOMPurify from 'dompurify';
import type { EuiThemeColorModeStandard, EuiThemeComputed } from '@elastic/eui';
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
  return `:root{${vars.map(([k, v]) => `${k}:${v}`).join(';')}}`;
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
