/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlParam } from './types';

const PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_]*/;

interface ParamToken {
  readonly name: string;
  /** `??name` is an identifier (field/function name) parameter rather than a value. */
  readonly isIdentifier: boolean;
  readonly start: number;
  readonly end: number;
}

function scanParams(query: string): ParamToken[] {
  const tokens: ParamToken[] = [];
  let index = 0;

  while (index < query.length) {
    const char = query[index];

    if (query.startsWith('"""', index)) {
      const end = query.indexOf('"""', index + 3);
      index = end === -1 ? query.length : end + 3;
    } else if (char === '"') {
      index += 1;
      while (index < query.length && query[index] !== '"') {
        index += query[index] === '\\' ? 2 : 1;
      }
      index += 1;
    } else if (query.startsWith('//', index)) {
      const end = query.indexOf('\n', index);
      index = end === -1 ? query.length : end + 1;
    } else if (query.startsWith('/*', index)) {
      const end = query.indexOf('*/', index + 2);
      index = end === -1 ? query.length : end + 2;
    } else if (char === '?') {
      const isIdentifier = query[index + 1] === '?';
      const nameStart = isIdentifier ? index + 2 : index + 1;
      const match = PARAM_NAME.exec(query.slice(nameStart));
      const end = nameStart + (match ? match[0].length : 0);
      if (match) {
        tokens.push({ name: match[0], isIdentifier, start: index, end });
      }
      index = end;
    } else {
      index += 1;
    }
  }

  return tokens;
}

/** Returns the distinct `?name` placeholders in an ES|QL query, skipping strings and comments. */
export function findEsqlParamNames(query: string): string[] {
  return [...new Set(scanParams(query).map(({ name }) => name))];
}

function toLiteral({ type, value }: EsqlParam): string {
  if (type === 'number' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return String(Number(value));
  }
  if (type === 'boolean' && (value === 'true' || value === 'false')) {
    return value;
  }
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

/** Replaces `?name` placeholders with literal values, for consumers that cannot pass params. */
export function inlineEsqlParams(query: string, params: readonly EsqlParam[]): string {
  const byName = new Map(params.map((param) => [param.name, param]));
  let result = '';
  let position = 0;
  for (const { name, isIdentifier, start, end } of scanParams(query)) {
    const param = byName.get(name);
    if (param) {
      const replacement = isIdentifier
        ? `\`${param.value.replace(/`/g, '``')}\``
        : toLiteral(param);
      result += query.slice(position, start) + replacement;
      position = end;
    }
  }
  return result + query.slice(position);
}
