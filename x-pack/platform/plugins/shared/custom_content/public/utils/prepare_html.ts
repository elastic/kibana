/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DOMPurify from 'dompurify';
import type { EuiThemeColorModeStandard } from '@elastic/eui';
import { CUSTOM_CONTENT_SCRIPT_PATTERN, stripMarkdownFences } from '@kbn/custom-content-common';
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

export function prepareHtml(html: string, colorMode?: EuiThemeColorModeStandard): string {
  return injectCsp(sanitizeHtml(stripMarkdownFences(html)), colorMode);
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['a'],
    WHOLE_DOCUMENT: true,
    FORCE_BODY: false,
  }) as string;
}

// The rendering iframe is scripting-disabled and sanitizeHtml() strips <script> tags outright,
// so a template relying on one wouldn't error — it would just silently render blank. Catching it
// here, before that silent stripping, turns it into a clear error instead.
export function containsScript(template: string): boolean {
  return CUSTOM_CONTENT_SCRIPT_PATTERN.test(template);
}

// LLMs can return plain text, markdown, or empty strings — any of which would render blank.
// Require at least one HTML tag so the retry path kicks in for those non-renderable outputs.
const HTML_TAG_PATTERN = /<[a-zA-Z]/;

export function isValidTemplate(template: string): boolean {
  return HTML_TAG_PATTERN.test(template);
}
