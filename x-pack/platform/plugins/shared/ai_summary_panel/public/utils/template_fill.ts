/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TEMPLATE_SENTINEL = '<!--ai-template-->';

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">`;

function injectCsp(html: string): string {
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return html.slice(0, at) + CSP_META + html.slice(at);
  }
  return CSP_META + html;
}

export function isTemplate(html: string): boolean {
  return html.trimStart().startsWith(TEMPLATE_SENTINEL);
}

export interface TemplateColumn {
  name: string;
  type: string;
}

// Dots, hyphens, and spaces in column names (e.g. "category.keyword") are normalized to
// underscores so that LLM-generated placeholders like {{category_keyword}} resolve correctly.
const normalizeColName = (s: string) => s.replace(/[.\-\s]+/g, '_');

// Comparison operators recognised in conditional block names, e.g. {{#revenue_gte_10000}}.
// Longer tokens checked first so "_gte_" is never mis-parsed as "_gt_".
const COND_OPS: Array<{ token: string; fn: (a: number, b: number) => boolean }> = [
  { token: '_gte_', fn: (a, b) => a >= b },
  { token: '_lte_', fn: (a, b) => a <= b },
  { token: '_gt_', fn: (a, b) => a > b },
  { token: '_lt_', fn: (a, b) => a < b },
];

export function fillTemplate(
  template: string,
  columns: TemplateColumn[],
  rows: unknown[][]
): string {
  const colIndex = new Map(columns.map((c, i) => [c.name, i]));
  const colNormIndex = new Map(columns.map((c, i) => [normalizeColName(c.name), i]));

  const maxValues = new Map<string, number>();
  for (const col of columns) {
    const idx = colIndex.get(col.name)!;
    const nums = rows.map((r) => Number(r[idx])).filter((v) => isFinite(v));
    if (nums.length > 0) maxValues.set(col.name, Math.max(...nums));
  }

  function resolveIdx(col: string): number | undefined {
    return colIndex.get(col) ?? colNormIndex.get(normalizeColName(col));
  }

  function resolveVal(col: string, pct: boolean, row: unknown[]): string {
    const idx = resolveIdx(col);
    if (idx === undefined) return '';
    const colName = columns[idx].name;
    const val = row[idx];
    if (pct) {
      const max = maxValues.get(colName) ?? 1;
      return max !== 0 ? String(Math.round((Number(val) / max) * 100)) : '0';
    }
    return String(val ?? '');
  }

  // Evaluate a conditional block name like "revenue_gte_10000" or "revenue_gte_5000_lt_10000".
  // Returns true/false when it recognises the pattern, null when it doesn't.
  function evalConditional(blockName: string, row: unknown[]): boolean | null {
    for (const op of COND_OPS) {
      const opIdx = blockName.indexOf(op.token);
      if (opIdx === -1) continue;

      const colPart = blockName.slice(0, opIdx);
      const colIdx = resolveIdx(colPart);
      if (colIdx === undefined) continue;

      const val = Number(row[colIdx]);
      if (!isFinite(val)) return false;

      const rest = blockName.slice(opIdx + op.token.length); // e.g. "10000" or "5000_lt_10000"
      const numMatch = rest.match(/^(\d+(?:\.\d+)?)/);
      if (!numMatch) continue;
      if (!op.fn(val, parseFloat(numMatch[1]))) return false;

      // Optional second condition, e.g. _lt_10000 appended after _gte_5000
      const rest2 = rest.slice(numMatch[0].length);
      for (const op2 of COND_OPS) {
        if (rest2.startsWith(op2.token)) {
          const numMatch2 = rest2.slice(op2.token.length).match(/^(\d+(?:\.\d+)?)/);
          if (numMatch2 && !op2.fn(val, parseFloat(numMatch2[1]))) return false;
          break;
        }
      }
      return true;
    }
    return null;
  }

  // Fill one row's copy of the repeating template, evaluating conditionals and placeholders.
  function fillRow(rowTpl: string, row: unknown[]): string {
    // Conditional sections: {{#col_op_N}}...{{/col_op_N}}
    let filled = rowTpl.replace(
      /\{\{#(\w[\w.]*?)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_m: string, blockName: string, content: string) => {
        const result = evalConditional(blockName, row);
        if (result === null) return ''; // unrecognised block — strip
        return result ? content : '';
      }
    );
    // Simple value placeholders
    filled = filled.replace(/\{\{(\w[\w.]*?)(_pct)?\}\}/g, (_m: string, col: string, p?: string) =>
      resolveVal(col, Boolean(p), row)
    );
    return filled;
  }

  let result = template.trimStart();
  if (result.startsWith(TEMPLATE_SENTINEL)) {
    result = result.slice(TEMPLATE_SENTINEL.length);
  }

  if (rows.length > 0) {
    result = result.replace(
      /\{\{#rows\}\}([\s\S]*?)\{\{\/rows\}\}/g,
      (_match: string, rowTpl: string) => rows.map((row) => fillRow(rowTpl, row)).join('')
    );
    result = result.replace(/\{\{\^rows\}\}[\s\S]*?\{\{\/rows\}\}/g, '');
  } else {
    result = result.replace(/\{\{#rows\}\}[\s\S]*?\{\{\/rows\}\}/g, '');
    result = result.replace(/\{\{\^rows\}\}([\s\S]*?)\{\{\/rows\}\}/g, '$1');
  }

  // Top-level {{col}} — single-value KPIs using first row
  const firstRow = rows[0] ?? [];
  result = result.replace(/\{\{(\w[\w.]*?)(_pct)?\}\}/g, (_m: string, col: string, p?: string) =>
    resolveVal(col, Boolean(p), firstRow)
  );

  return injectCsp(result);
}

// Session-level template cache. Survives React re-renders and time-range changes within the
// same browser session; does not survive page reload (SO cache handles cross-session persistence).
const TPL_KEY = 'ai_panel_tpl:';
const TPL_TTL_MS = 24 * 60 * 60 * 1000;

function tplHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33 + s.charCodeAt(i)) % 2147483647;
  }
  return h.toString(36);
}

function tplKey(prompt: string, esqlQuery: string): string {
  return TPL_KEY + tplHash(prompt + '\0' + esqlQuery);
}

export function readSessionTemplate(prompt: string, esqlQuery: string): string | null {
  try {
    const raw = sessionStorage.getItem(tplKey(prompt, esqlQuery));
    if (!raw) return null;
    const { tpl, ts } = JSON.parse(raw) as { tpl: string; ts: number };
    return Date.now() - ts < TPL_TTL_MS ? tpl : null;
  } catch {
    return null;
  }
}

export function writeSessionTemplate(prompt: string, esqlQuery: string, template: string): void {
  try {
    sessionStorage.setItem(
      tplKey(prompt, esqlQuery),
      JSON.stringify({ tpl: template, ts: Date.now() })
    );
  } catch {
    /* sessionStorage full — non-fatal */
  }
}
