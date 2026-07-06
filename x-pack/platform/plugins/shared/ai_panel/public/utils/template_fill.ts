/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DOMPurify from 'dompurify';
import { Liquid } from 'liquidjs';
import { columnNamesToKeys } from '../../common/utils';

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">`;

const liquid = new Liquid({
  strictFilters: false,
  strictVariables: false,
  dynamicPartials: false,
  outputEscape: 'escape',
});

export function injectCsp(html: string): string {
  if (html.includes(CSP_META)) return html;
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return html.slice(0, at) + CSP_META + html.slice(at);
  }
  return CSP_META + html;
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
const FENCE_ANYWHERE = /```(?:html|HTML)?/g;

export function stripMarkdownFences(raw: string): string {
  return raw
    .trim()
    .replace(FENCE_OPEN, '')
    .replace(FENCE_CLOSE, '')
    .replace(FENCE_ANYWHERE, '')
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

export function fillTemplate(
  template: string,
  columns: TemplateColumn[],
  rows: unknown[][]
): string {
  const keys = columnNamesToKeys(columns.map((c) => c.name));

  const maxValues: Record<string, number> = {};
  columns.forEach((_col, i) => {
    const nums = rows.map((r) => Number(r[i])).filter((v) => isFinite(v));
    if (nums.length > 0) maxValues[keys[i]] = nums.reduce((a, b) => (b > a ? b : a), -Infinity);
  });

  const rowObjects = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((_col, i) => {
      const key = keys[i];
      obj[key] = row[i];
      const max = maxValues[key];
      if (max !== undefined) {
        const num = Number(row[i]);
        obj[`${key}_pct`] =
          max === 0
            ? 0
            : isFinite(num)
            ? Math.min(100, Math.max(0, Math.round((num / max) * 100)))
            : 0;
      }
    });
    return obj;
  });

  const rendered = liquid.parseAndRenderSync(template.trim(), { rows: rowObjects, max: maxValues });

  return prepareHtml(rendered);
}
