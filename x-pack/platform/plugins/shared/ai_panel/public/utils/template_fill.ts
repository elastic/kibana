/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DOMPurify from 'dompurify';
import { Liquid } from 'liquidjs';
import { AI_PANEL_CSP_META } from '../../common/constants';

const liquid = new Liquid({
  strictFilters: false,
  strictVariables: false,
  dynamicPartials: false,
  outputEscape: 'escape',
});

export function injectCsp(html: string): string {
  if (html.includes(AI_PANEL_CSP_META)) return html;
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return html.slice(0, at) + AI_PANEL_CSP_META + html.slice(at);
  }
  return AI_PANEL_CSP_META + html;
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

const HTML_TAG_PATTERN = /<[a-zA-Z]/;

export function isValidTemplate(template: string): boolean {
  return HTML_TAG_PATTERN.test(template);
}

export interface TemplateColumn {
  name: string;
  type: string;
}

// Keyed by the raw column name (unique by construction in ES|QL) instead of a normalized
// identifier, so distinct columns can never collide onto the same key.
export function fillTemplate(
  template: string,
  columns: TemplateColumn[],
  rows: unknown[][]
): string {
  const maxValues: Record<string, number> = {};
  columns.forEach((col, i) => {
    const nums = rows.map((r) => Number(r[i])).filter((v) => isFinite(v));
    if (nums.length > 0) maxValues[col.name] = nums.reduce((a, b) => (b > a ? b : a), -Infinity);
  });

  const rowObjects = rows.map((row) => {
    const obj: Record<string, { value: unknown; pct?: number }> = {};
    columns.forEach((col, i) => {
      const max = maxValues[col.name];
      let pct: number | undefined;
      if (max !== undefined) {
        const num = Number(row[i]);
        pct =
          max === 0
            ? 0
            : isFinite(num)
            ? Math.min(100, Math.max(0, Math.round((num / max) * 100)))
            : 0;
      }
      obj[col.name] = { value: row[i], pct };
    });
    return obj;
  });

  const rendered = liquid.parseAndRenderSync(template.trim(), { rows: rowObjects, max: maxValues });

  return prepareHtml(rendered);
}
