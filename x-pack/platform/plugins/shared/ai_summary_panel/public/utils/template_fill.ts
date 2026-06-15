/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TEMPLATE_SENTINEL = '<!--ai-template-->';

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">`;

export function injectCsp(html: string): string {
  if (html.includes(CSP_META)) return html;
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return html.slice(0, at) + CSP_META + html.slice(at);
  }
  return CSP_META + html;
}

export function isTemplate(html: string): boolean {
  return html.includes(TEMPLATE_SENTINEL);
}

// Cleans raw LLM output before storing or filling:
// - Strips markdown code fences (```html...```)
// - Discards any text the LLM emitted before the sentinel
// - Adds the sentinel if the LLM forgot it entirely
export function sanitizeTemplate(raw: string): string {
  let s = raw.trim();
  // Strip markdown fences
  s = s
    .replace(/^```(?:html|HTML)?\s*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();
  // Find sentinel — discard LLM preamble that appears before it
  const idx = s.indexOf(TEMPLATE_SENTINEL);
  if (idx > 0) {
    s = s.slice(idx);
  } else if (idx === -1) {
    s = TEMPLATE_SENTINEL + '\n' + s;
  }
  return s;
}

// Returns true if the template looks structurally valid (has closing HTML tag or at least a div)
export function isValidTemplate(template: string): boolean {
  return (
    template.includes('</html>') || template.includes('</body>') || template.includes('</div>')
  );
}

export interface TemplateColumn {
  name: string;
  type: string;
}

// All non-alphanumeric characters normalized to underscore, leading/trailing underscores stripped.
// e.g. "category.keyword" → "category_keyword", "@timestamp" → "timestamp"
const normalizeColName = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

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

  // Evaluates conditional block names like "revenue_gte_10000" or "revenue_gte_5000_lt_10000".
  // Returns true/false when recognised, null otherwise.
  function evalConditional(blockName: string, row: unknown[]): boolean | null {
    for (const op of COND_OPS) {
      const opIdx = blockName.indexOf(op.token);
      if (opIdx === -1) continue;

      const colPart = blockName.slice(0, opIdx);
      const colIdx = resolveIdx(colPart);
      if (colIdx === undefined) continue;

      const val = Number(row[colIdx]);
      if (!isFinite(val)) return false;

      const rest = blockName.slice(opIdx + op.token.length);
      const numMatch = rest.match(/^(\d+(?:\.\d+)?)/);
      if (!numMatch) continue;
      if (!op.fn(val, parseFloat(numMatch[1]))) return false;

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

  function fillRow(rowTpl: string, row: unknown[]): string {
    let filled = rowTpl.replace(
      /\{\{#(\w[\w.]*?)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_m: string, blockName: string, content: string) => {
        const result = evalConditional(blockName, row);
        if (result === null) return '';
        return result ? content : '';
      }
    );
    filled = filled.replace(/\{\{(\w[\w.]*?)(_pct)?\}\}/g, (_m: string, col: string, p?: string) =>
      resolveVal(col, Boolean(p), row)
    );
    return filled;
  }

  // Strip sentinel
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

  // Strip any remaining unresolved block tags (unclosed {{#tag}} or {{/tag}})
  result = result.replace(/\{\{[#^/][^}]*\}\}/g, '');

  // Strip any remaining unresolved value placeholders (wrong column names from LLM)
  result = result.replace(/\{\{[^}]+\}\}/g, '');

  return injectCsp(result);
}
