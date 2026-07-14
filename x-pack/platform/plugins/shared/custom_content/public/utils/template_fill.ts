/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DOMPurify from 'dompurify';
import { CUSTOM_CONTENT_CSP_META } from '../../common/constants';

export function injectCsp(html: string): string {
  if (html.includes(CUSTOM_CONTENT_CSP_META)) return html;
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return html.slice(0, at) + CUSTOM_CONTENT_CSP_META + html.slice(at);
  }
  return CUSTOM_CONTENT_CSP_META + html;
}

export function prepareHtml(html: string): string {
  return injectCsp(sanitizeHtml(stripMarkdownFences(html)));
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['a'],
    WHOLE_DOCUMENT: true,
    FORCE_BODY: false,
  }) as string;
}

const FENCE_OPEN = /^```(?:html|HTML)?\s*\n?/;
const FENCE_CLOSE = /\n?```\s*$/;
const FENCE_MARKER = /```(?:html|HTML)?/g;
// Only strip markers near an edge — likely the wrapping fence, not fenced code meant to display.
const FENCE_EDGE_WINDOW = 200;

export function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim().replace(FENCE_OPEN, '').replace(FENCE_CLOSE, '');
  return trimmed
    .replace(FENCE_MARKER, (match, offset: number) => {
      const distanceFromEdge = Math.min(offset, trimmed.length - offset - match.length);
      return distanceFromEdge <= FENCE_EDGE_WINDOW ? '' : match;
    })
    .trim();
}

// The rendering iframe is scripting-disabled and sanitizeHtml() strips <script> tags outright,
// so a template relying on one wouldn't error — it would just silently render blank. Catching it
// here, before that silent stripping, turns it into a clear error instead.
const SCRIPT_TAG_PATTERN = /<script[\s>]/i;

export function containsScript(template: string): boolean {
  return SCRIPT_TAG_PATTERN.test(template);
}
