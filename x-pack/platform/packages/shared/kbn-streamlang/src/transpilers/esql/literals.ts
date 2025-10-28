/*
 * Copyright Elasticsearch B.V.
 * Licensed under the Elastic License 2.0.
 */

import type { ESQLLiteral, ESQLStringLiteral } from '@kbn/esql-ast/src/types';

const hasUnquotedValue = (literal: ESQLLiteral): literal is ESQLStringLiteral =>
  'valueUnquoted' in literal && typeof literal.valueUnquoted === 'string';

const stripWrappingQuotes = (value: string): string | undefined => {
  if (value.length < 2) return undefined;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return undefined;
};

export function literalToJs(lit: ESQLLiteral) {
  if (hasUnquotedValue(lit) && lit.valueUnquoted !== '') return lit.valueUnquoted;

  if ('value' in lit && lit.value !== undefined) {
    const v = lit.value;
    if (typeof v === 'string') {
      const unq = stripWrappingQuotes(v) ?? v;
      if (/^(true|false)$/i.test(unq)) return unq.toLowerCase() === 'true';
      const n = Number(unq);
      if (!Number.isNaN(n) && unq.trim() !== '') return n;
      return unq;
    }
    return v;
  }

  const text = String(lit.text ?? '').trim();
  const unquoted = stripWrappingQuotes(text);
  if (unquoted !== undefined) return unquoted.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  if (/^(true|false)$/i.test(text)) return text.toLowerCase() === 'true';
  const num = Number(text);
  if (!Number.isNaN(num)) return num;
  return text;
}


