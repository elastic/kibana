/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DOMPurify from 'dompurify';
import { Liquid } from 'liquidjs';
import { normalizeColumnName } from '../../common/utils';

// v2 sentinel — templates use Liquid syntax. Old v1 Mustache-style templates
// won't match and will trigger re-generation automatically.
export const TEMPLATE_SENTINEL = '<!--ai-template-v2-->';

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">`;

// Single shared engine — stateless, safe to reuse across renders.
const liquid = new Liquid({ strictFilters: false, strictVariables: false });

export function injectCsp(html: string): string {
  if (html.includes(CSP_META)) return html;
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return html.slice(0, at) + CSP_META + html.slice(at);
  }
  return CSP_META + html;
}

// Strips <a> anchor tags and other unsafe elements before the HTML reaches the iframe.
// Applied after Liquid rendering so injected data values are also covered.
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['a'],
    WHOLE_DOCUMENT: true,
    FORCE_BODY: false,
  }) as string;
}

export function isTemplate(html: string): boolean {
  return html.includes(TEMPLATE_SENTINEL);
}

export function sanitizeTemplate(raw: string): string {
  let s = raw.trim();
  s = s
    .replace(/^```(?:html|HTML)?\s*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();
  const idx = s.indexOf(TEMPLATE_SENTINEL);
  if (idx > 0) {
    s = s.slice(idx);
  } else if (idx === -1) {
    s = TEMPLATE_SENTINEL + '\n' + s;
  }
  return s;
}

export function isValidTemplate(template: string): boolean {
  return /<[a-zA-Z]/.test(template);
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
  let tpl = template.trimStart();
  if (tpl.startsWith(TEMPLATE_SENTINEL)) {
    tpl = tpl.slice(TEMPLATE_SENTINEL.length);
  }

  // Pre-compute column max values for _pct variants
  const maxValues: Record<string, number> = {};
  columns.forEach((col, i) => {
    const key = normalizeColumnName(col.name);
    const nums = rows.map((r) => Number(r[i])).filter((v) => isFinite(v));
    if (nums.length > 0) maxValues[key] = Math.max(...nums);
  });

  // Each row becomes a plain object: { col_name: value, col_name_pct: 0–100 }
  const rowObjects = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      const key = normalizeColumnName(col.name);
      obj[key] = row[i];
      const max = maxValues[key];
      if (max !== undefined && max !== 0) {
        const num = Number(row[i]);
        obj[`${key}_pct`] = isFinite(num)
          ? Math.min(100, Math.max(0, Math.round((num / max) * 100)))
          : 0;
      }
    });
    return obj;
  });

  let rendered: string;
  try {
    rendered = liquid.parseAndRenderSync(tpl, { rows: rowObjects, max: maxValues });
  } catch {
    rendered =
      '<p style="color:#d36086;padding:16px">Template error — please edit the prompt to regenerate.</p>';
  }

  return injectCsp(sanitizeHtml(rendered));
}
