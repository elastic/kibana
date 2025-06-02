/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { COLLAPSIBLE_PATTERNS, PATTERN_PRECEDENCE, TOKEN_SPLIT_CHARS } from './pattern_precedence';
import { TemplateRoot } from './types';

function isCollapsibleToken(token: string) {
  return token === 'NOTSPACE' || token === 'DATA';
}

function collapse(lhs: string, rhs: string) {
  if (lhs === rhs && isCollapsibleToken(lhs)) {
    return '';
  }
  return rhs;
}

function sanitize(value: string) {
  return value.replaceAll(/[\.\[\]\{\}]/g, '\\$&');
}

function getDisplayValue(values: string[], enumThreshold: number): string | null {
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
    return distinct.length === 1 ? distinct[0] : null;
  }

  const lengths = Array.from(new Set(values.map((v) => v.length)));
  const fixedLen = lengths.length === 1;
  const minLength = Math.min(...lengths);
  const maxLength = Math.max(...lengths);
  const usefulLength = fixedLen || (minLength >= 1 && maxLength <= 6) || maxLength - minLength <= 2;
  const len = usefulLength ? `{${uniq([minLength, maxLength]).join(',')}}` : '+';

  if (numeric) {
    return fixedLen ? '0'.repeat(minLength) : len ? `(\\d${len})` : '<INT>';
  }

  if (whitespace) {
    return fixedLen && minLength === 1 ? ' ' : `\\s${len}`;
  }

  if (distinct.length <= enumThreshold) {
    return distinct.length === 1 ? distinct[0] : `(${distinct.join('|')})`;
  }

  if (alpha || alnum) {
    return fixedLen ? 'a'.repeat(minLength) : '<WORD>';
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
  let counter: number = 0;
  function uniqueId() {
    return String(counter++);
  }

  const columns = roots.map((column) => {
    const tokens = column.tokens.map(({ values, patterns }) => {
      // const uniqueValues = uniq(values);
      // // Collect all values from the token row
      // const patternIndex = patterns[0];

      // const pattern = patternIndex !== undefined ? PATTERN_PRECEDENCE[patternIndex] : undefined;

      // const patternDisplay = pattern !== undefined ? `%{${pattern}}` : values[0];

      // const shouldReplacePattern =
      //   patternIndex === undefined || patternIndex > PATTERN_PRECEDENCE.indexOf('INT');

      // return {
      //   pattern: patternDisplay || values[0],
      //   value: (shouldReplacePattern && replacementFor(uniqueValues, 5)) || patternDisplay,
      // };

      return {
        id: uniqueId(),
        pattern: PATTERN_PRECEDENCE[patterns[0]],
        values,
      };
    });

    return {
      tokens,
      whitespace: column.whitespace,
    };
  });

  const usefulColumns = columns.slice(
    0,
    Math.min(
      8,
      columns.findLastIndex((col) => {
        return col.tokens.some(
          (token) => token.pattern && COLLAPSIBLE_PATTERNS.indexOf(token.pattern) === -1
        );
      }) + 1
    )
  );

  if (usefulColumns.length < columns.length) {
    usefulColumns.push({
      tokens: [{ pattern: 'GREEDYDATA', values: [], id: uniqueId() }],
      whitespace: { leading: 0, trailing: 0 },
    });
  }

  function getDisplayedTokens(tokens: Array<{ id: string; pattern: string; values: string[] }>) {
    const next: Array<{ id: string; pattern: string; values: string[] }> = [];

    tokens.forEach((token, idx) => {
      if (
        tokens[idx - 1] &&
        isCollapsibleToken(tokens[idx - 1].pattern) &&
        isCollapsibleToken(token.pattern)
      ) {
        next[next.length - 1].values = next[next.length - 1].values.map((val, index) => {
          return val + token.values[index];
        });
        return;
      }
      next.push(token);
    });

    return next;
  }

  function formatColumns(
    displayToken: (token: { id: string; pattern: string; values: string[] }) => string
  ) {
    return usefulColumns.reduce((acc, { tokens, whitespace }) => {
      return (
        (acc ? acc + (delimiter === '\\s' ? ' ' : delimiter) : '') +
        ' '.repeat(whitespace.leading) +
        getDisplayedTokens(tokens)
          .map((token) => displayToken(token))
          .join('') +
        ' '.repeat(whitespace.trailing)
      );
    }, '');
  }

  function sanitizeWhitespace(str: string) {
    return str.replaceAll(/[\s]{2,}/g, '\\s+').replaceAll(/\s/g, '\\s');
  }

  const displayedTokens = usefulColumns
    .flatMap((col) => getDisplayedTokens(col.tokens))
    .filter((token) => !TOKEN_SPLIT_CHARS.includes(token.pattern));

  const fieldValueExamples = Object.fromEntries(
    displayedTokens.map((token) => {
      return [`field_${token.id}`, token.values];
    })
  );

  const grok = sanitizeWhitespace(
    formatColumns((token) => {
      return !TOKEN_SPLIT_CHARS.includes(token.pattern)
        ? `%{${token.pattern}:field_${token.id}}`
        : sanitize(token.pattern);
    })
  );

  return {
    columns,
    delimiter,
    values: fieldValueExamples,
    formatted: {
      display: sanitizeWhitespace(
        formatColumns(({ values, pattern }) => {
          const uniqueValues = uniq(values);

          const displayValue = getDisplayValue(uniqueValues, 5);

          if (displayValue) {
            return `${displayValue}`;
          }
          return `<${pattern}>`;
        })
      ),
      grok,
    },
  };
}
