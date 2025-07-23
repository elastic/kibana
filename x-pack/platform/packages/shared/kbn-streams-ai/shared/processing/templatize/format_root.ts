/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { COLLAPSIBLE_PATTERNS, PATTERN_PRECEDENCE, TOKEN_SPLIT_CHARS } from './pattern_precedence';
import { TemplateRoot } from './types';
import type { NormalizedColumn } from './normalize_tokens';
import { GROK_REGEX_MAP } from './get_pattern_regex_map';

function isCollapsibleToken(token: string) {
  return COLLAPSIBLE_PATTERNS.includes(token);
}

function sanitize(value: string) {
  return value.replaceAll(/[\.\[\]\{\}]/g, '\\$&');
}

function sanitizeWhitespace(str: string) {
  return str.replaceAll(/[\s]{2,}/g, '\\s+').replaceAll(/\s/g, '\\s');
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

export function formatRoot(roots: NormalizedColumn[], delimiter: string): TemplateRoot {
  const { columns, usefulColumns } = getUsefulTokens(roots, delimiter);

  function getDisplayedTokens(
    tokens: Array<{ id: string | undefined; pattern: string; values: string[] }>
  ) {
    const next: Array<{ id: string | undefined; pattern: string; values: string[] }> = [];

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
    displayToken: (token: { id: string | undefined; pattern: string; values: string[] }) => string
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

  const displayedTokens = usefulColumns
    .flatMap((col) => getDisplayedTokens(col.tokens))
    .filter((token) => !TOKEN_SPLIT_CHARS.includes(token.pattern));

  const fieldValueExamples = Object.fromEntries(
    displayedTokens.map((token) => {
      return [token.id, token.values];
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
      grok: sanitizeWhitespace(
        formatColumns((token) => {
          return !TOKEN_SPLIT_CHARS.includes(token.pattern)
            ? `%{${token.pattern}:${token.id}}`
            : sanitize(token.pattern);
        })
      ),
    },
  };
}

type NamedColumn = ReturnType<typeof getUsefulTokens>['usefulColumns'][number];

/**
 * Example tuples:
 *
 * ```json
 * [
 *   ["[", undefined],
 *   ["DAY", "field_0"],
 *   [" ", undefined],
 *   ["SYSLOGTIMESTAMP", "field_1"],
 *   [" ", undefined],
 *   ["INT", "field_2"],
 *   ["]", undefined],
 *   [" ", undefined],
 *   ["[", undefined],
 *   ["LOGLEVEL", "field_3"],
 *   ["]", undefined],
 *   [" ", undefined],
 *   ["GREEDYDATA", "field_4"]
 * ]
 * ```
 */
type TokenTuple = [string, string | undefined];

export function getUsefulTokens(roots: NormalizedColumn[], delimiter: string) {
  let counter: number = 1;
  function uniqueId() {
    return String(counter++);
  }

  const columns = roots.map((column) => {
    return {
      tokens: column.tokens.map(({ values, patterns }) => {
        const pattern = PATTERN_PRECEDENCE[patterns[0]];
        return {
          id: !TOKEN_SPLIT_CHARS.includes(pattern) ? `field_${uniqueId()}` : undefined,
          pattern,
          values,
        };
      }),
      whitespace: column.whitespace,
    };
  });

  const usefulColumns = columns.slice(
    0,
    Math.max(
      // Find last column that is surrounded by variable whitespace (this indicates intentional separation so should not be collapsed into GREEDYDATA)
      columns.findLastIndex((col) => {
        return col.whitespace.leading > 0 || col.whitespace.trailing > 0;
      }),
      // Find last column that is not just freeform text (the rest can be collapsed into GREEDYDATA)
      columns.findLastIndex((col) => {
        return col.tokens.some(
          (token) => token.pattern && COLLAPSIBLE_PATTERNS.indexOf(token.pattern) === -1
        );
      }) + 1
    )
  );

  if (usefulColumns.length < columns.length) {
    usefulColumns.push({
      tokens: [
        { pattern: 'GREEDYDATA', values: [], id: columns[usefulColumns.length].tokens[0].id },
      ],
      whitespace: {
        leading: columns[usefulColumns.length].whitespace.leading,
        trailing: columns[columns.length - 1].whitespace.trailing,
      },
    });
  }

  const usefulTokens = usefulColumns.reduce<TokenTuple[]>((acc, col, i) => {
    if (i > 0) {
      acc.push([delimiter === '\\s' ? ' ' : delimiter, undefined]);
    }
    if (col.whitespace.leading) {
      acc.push([' '.repeat(col.whitespace.leading), undefined]);
    }
    col.tokens.forEach((token) => {
      acc.push([token.pattern, token.id]);
    });
    if (col.whitespace.trailing) {
      acc.push([' '.repeat(col.whitespace.trailing), undefined]);
    }
    return acc;
  }, []);

  return { columns, usefulColumns, usefulTokens };
}

export type ReviewFields = Record<
  string,
  {
    grok_component: string;
    example_values: string[];
  }
>;

/**
 * Generates an object of fields with their corresponding GROK component and example values.
 *
 * Example output:
 *
 * ```json
 * {
 *     "field_0": {
 *         "grok_component": "DAY",
 *         "example_values": ["Mon", "Tue", "Wed", "Thu", "Fri"]
 *     },
 *     "field_1": {
 *         "grok_component": "SYSLOGTIMESTAMP",
 *         "example_values": ["Jul 14 13:45:31", "Jul 14 13:45:30", "Jul 14 13:45:22", "Jul 14 13:45:21", "Jul 14 13:45:20"]
 *     },
 *     "field_2": {
 *         "grok_component": "INT",
 *         "example_values": ["2025"]
 *     },
 *     "field_3": {
 *         "grok_component": "LOGLEVEL",
 *         "example_values": ["error", "notice"]
 *     },
 *     "field_4": {
 *         "grok_component": "GREEDYDATA",
 *         "example_values": []
 *     }
 * }
 * ```
 */
export function getReviewFields(columns: NamedColumn[], numExamples = 5) {
  return columns.reduce<ReviewFields>((acc, { tokens }) => {
    tokens.forEach((token) => {
      if (token.id) {
        acc[token.id] = {
          grok_component: token.pattern,
          example_values: uniq(token.values).slice(0, numExamples),
        };
      }
    });
    return acc;
  }, {});
}

export interface GrokProcessorResult {
  description: string;
  patterns: string[];
  pattern_definitions: Record<string, string>;
}

/**
 * Combines useful tokens and result from LLM review into a GROK processor definition.
 *
 * Example input:
 *
 * ```json
 * [
 *   ["[", undefined],
 *   ["DAY", "field_0"],
 *   [" ", undefined],
 *   ["SYSLOGTIMESTAMP", "field_1"],
 *   [" ", undefined],
 *   ["INT", "field_2"],
 *   ["]", undefined],
 *   [" ", undefined],
 *   ["[", undefined],
 *   ["LOGLEVEL", "field_3"],
 *   ["]", undefined],
 *   [" ", undefined],
 *   ["GREEDYDATA", "field_4"]
 * ]
 * ```
 *
 * ```json
 * {
 *     "log_source": "Apache HTTP Server Log",
 *     "fields": [
 *         {
 *             "name": "@timestamp",
 *             "columns": ["field_0", "field_1", "field_2"],
 *             "grok_components": ["DAY", "SYSLOGTIMESTAMP", "YEAR"]
 *         },
 *         {
 *             "name": "log.level",
 *             "columns": ["field_3"],
 *             "grok_components": ["LOGLEVEL"]
 *         },
 *         {
 *             "name": "message",
 *             "columns": ["field_4"],
 *             "grok_components": ["GREEDYDATA"]
 *         }
 *     ]
 * }
 * ```
 *
 * Expected output:
 * ```json
 * {
 *   "description": "Apache HTTP Server Log",
 *   "patterns": [
 *     "[%{CUSTOM_TIMESTAMP:@timestamp}] [%{LOGLEVEL:log.level}] %{GREEDYDATA:message}"
 *   ],
 *   "pattern_definitions": {
 *     "CUSTOM_TIMESTAMP": "%{DAY} %{SYSLOGTIMESTAMP} %{YEAR}"
 *   }
 * }
 * ```
 */
export function getGrokProcessor(
  usefulTokens: TokenTuple[],
  reviewFields: ReviewFields,
  reviewResult: NormalizedReviewResult
): GrokProcessorResult {
  let rootPattern = '';
  const patternDefinitions: Record<string, string> = {};
  let targetDefinition: string | undefined;

  const appendToken = (token: string, id: string | undefined) => {
    if (targetDefinition) {
      if (!patternDefinitions[targetDefinition]) {
        patternDefinitions[targetDefinition] = '';
      }
      patternDefinitions[targetDefinition] += id ? `%{${token}}` : sanitize(token);
    } else {
      rootPattern += id ? `%{${token}:${id}}` : sanitize(token);
    }
  };

  const pickValidPattern = (
    suggestedPattern: string,
    originalPattern: string,
    exampleValues: string[]
  ) => {
    // If the suggested pattern is a collapsible token, return the original pattern. These have been vetted by the heuristics to not be unecessarily greedy, something the LLM is not able to do, so should not be changed
    if (isCollapsibleToken(suggestedPattern)) {
      return originalPattern;
    }
    // If the suggested pattern does not match any of the example values, return the original pattern
    if (
      suggestedPattern !== originalPattern &&
      exampleValues.some(
        (val) =>
          !GROK_REGEX_MAP[suggestedPattern] || !GROK_REGEX_MAP[suggestedPattern].complete.test(val)
      )
    ) {
      return originalPattern;
    }
    return suggestedPattern;
  };

  usefulTokens.forEach(([token, id]) => {
    if (id) {
      const match = reviewResult.fields.find((field) => field.columns.includes(id));
      if (match) {
        const exampleValues = reviewFields[id]?.example_values ?? [];
        if (match.columns.length >= 2) {
          // Token is part of a field with multiple columns, create a custom pattern definition and add the token to it
          const index = match.columns.indexOf(id);
          const patternDefinition = `CUSTOM_${match.name
            .toUpperCase()
            .replace(/\W+/g, '_')
            .replace(/^_|_$/g, '')}`;

          if (index === 0) {
            appendToken(patternDefinition, match.name);

            // Change destination to custom pattern destination
            targetDefinition = patternDefinition;
          }

          // Append the token to the current pattern definition
          appendToken(
            pickValidPattern(match.grok_components[index], token, exampleValues),
            match.name
          );

          if (index === match.columns.length - 1) {
            // Change destination back after the last column
            targetDefinition = undefined;
          }
        } else {
          // Token is part of a single column field, change the token according to the feedback and add to the root pattern
          appendToken(pickValidPattern(match.grok_components[0], token, exampleValues), match.name);
        }
      } else {
        // Token is a field but did not get reviewed, keep as is and add the token to the current pattern definition
        appendToken(token, id);
      }
    } else {
      // Token is a separator character, keep as is and add to the current pattern definition
      appendToken(token, id);
    }
  });

  return {
    description: reviewResult.log_source,
    patterns: [sanitizeWhitespace(rootPattern)],
    pattern_definitions: Object.fromEntries(
      Object.entries(patternDefinitions).map(([key, value]) => [key, sanitizeWhitespace(value)])
    ),
  };
}

/**
 * Result from LLM review of fields where ECS field names have already been mapped to OpenTelemetry fields.
 *
 * Example value:
 *
 * ```json
 * {
 *     "log_source": "Apache HTTP Server Log",
 *     "fields": [
 *         {
 *             "name": "@timestamp",
 *             "columns": ["field_0", "field_1", "field_2"],
 *             "grok_components": ["DAY", "SYSLOGTIMESTAMP", "YEAR"]
 *         },
 *         {
 *             "name": "log.level",
 *             "columns": ["field_3"],
 *             "grok_components": ["LOGLEVEL"]
 *         },
 *         {
 *             "name": "message",
 *             "columns": ["field_4"],
 *             "grok_components": ["GREEDYDATA"]
 *         }
 *     ]
 * }
 * ```
 */
interface NormalizedReviewResult {
  log_source: string;
  fields: Array<{
    name: string;
    columns: string[];
    grok_components: string[];
  }>;
}
