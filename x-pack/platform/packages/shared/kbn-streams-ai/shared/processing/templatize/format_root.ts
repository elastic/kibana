/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { COLLAPSIBLE_PATTERNS, PATTERN_PRECEDENCE } from './pattern_precedence';
import { TemplateRoot } from './types';

function replacementFor(values: string[], enumThreshold: number): string | null {
  if (!values.length) return null;

  // helper predicates
  const all = (re: RegExp) => values.every((v) => re.test(v));
  const numeric = all(/^\d+$/);
  const whitespace = all(/^\s{1,}$/);
  const alpha = all(/^[A-Za-z]+$/);
  const alnum = all(/^[A-Za-z0-9]+$/);

  const distinct = Array.from(new Set(values));

  if (distinct.length === 1 && !numeric && !alpha) {
    return distinct[0];
  }

  if (!alpha && !numeric && !whitespace && !alnum) {
    return distinct.length === 1 ? `(${distinct[0]}` : null;
  }

  const lengths = Array.from(new Set(values.map((v) => v.length)));
  const fixedLen = lengths.length === 1;
  const minLength = Math.min(...lengths);
  const maxLength = Math.max(...lengths);
  const usefulLength = fixedLen || (minLength >= 1 && maxLength <= 6) || maxLength - minLength <= 2;
  const len = usefulLength ? `{${uniq([minLength, maxLength]).join(',')}}` : '+';

  if (numeric) {
    return fixedLen ? '0'.repeat(minLength) : len ? `(\\d${len})` : '%{INT}';
  }

  if (whitespace) {
    return fixedLen && minLength === 1 ? ' ' : `\\s${len}`;
  }

  if (distinct.length <= enumThreshold) {
    return `(${distinct.join('|')})`;
  }

  if (alpha || alnum) {
    return fixedLen ? 'a'.repeat(minLength) : '%{WORD}';
  }

  return null; // give up → keep original placeholder
}

export function formatRoot(
  roots: Array<{
    tokens: Array<{
      patterns: number[];
      values: string[];
    }>;
    whitespace: {
      leading: number;
      trailing: number;
    };
  }>,
  delimiter: string
): TemplateRoot {
  const columns = roots.map((column) => {
    const tokens = column.tokens.map(({ values, patterns }) => {
      const uniqueValues = uniq(values);
      // Collect all values from the token row
      const patternIndex = patterns[0];

      const pattern = patternIndex !== undefined ? PATTERN_PRECEDENCE[patternIndex] : undefined;

      const patternDisplay = pattern !== undefined ? `%{${pattern}}` : values[0];

      const shouldReplacePattern =
        patternIndex === undefined || patternIndex > PATTERN_PRECEDENCE.indexOf('MONTH');

      return {
        pattern: patternDisplay || values[0],
        value: (shouldReplacePattern && replacementFor(uniqueValues, 5)) || patternDisplay,
      };
    });

    return {
      tokens,
      whitespace: column.whitespace,
    };
  });

  const collapsiblePatterns = COLLAPSIBLE_PATTERNS.map((pattern) => `%{${pattern}}`);

  const usefulColumns = columns.slice(
    0,
    Math.min(
      8,
      columns.findLastIndex((col) => {
        return col.tokens.some((token) => collapsiblePatterns.indexOf(token.pattern) === -1);
      }) + 1
    )
  );

  if (usefulColumns.length < columns.length) {
    usefulColumns.push({
      tokens: [{ pattern: '%{GREEDYDATA}', value: '%{GREEDYDATA}' }],
      whitespace: { leading: 0, trailing: 0 },
    });
  }

  return {
    columns,
    formatted: usefulColumns
      .reduce((prev, { tokens, whitespace }, idx) => {
        return (
          (prev ? prev + (delimiter === '\\s' ? ' ' : delimiter) : '') +
          ' '.repeat(whitespace.leading) +
          tokens.map((token) => token.value).join('') +
          ' '.repeat(whitespace.trailing)
        );
      }, '')
      .replaceAll(/[\s]{2,}/g, '\\s+')
      .replaceAll(/\s/g, '\\s'),
    delimiter,
  };
}
