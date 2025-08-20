/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NamedToken } from '../types';
import { GROK_REGEX_MAP } from '../constants';
import type { NormalizedReviewResult } from './get_review_fields';
import { sanitize, isCollapsibleToken } from './get_review_fields';

export interface GrokProcessorResult {
  description: string;
  patterns: string[];
  pattern_definitions: Record<string, string>;
}

/**
 * Combines extracted tokens and result from LLM review into a GROK processor definition.
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
  tokens: NamedToken[],
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
    // If the suggested pattern is a collapsible token, return the original pattern. These have been vetted by the heuristics to not be unecessarily greedy, something the LLM does not do well, so should not be changed
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

  tokens.forEach((token) => {
    if (token.id) {
      const match = reviewResult.fields.find((field) => field.columns.includes(token.id!));
      if (match) {
        if (match.columns.length >= 2) {
          // Token is part of a field with multiple columns, create a custom pattern definition and add the token to it
          const index = match.columns.indexOf(token.id);
          const patternDefinition = `CUSTOM_${match.name
            .replace(/^(resource\.)?(attributes\.)?(custom_)?/g, '')
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
            pickValidPattern(match.grok_components[index], token.pattern, token.values),
            match.name
          );

          if (index === match.columns.length - 1) {
            // Change destination back after the last column
            targetDefinition = undefined;
          }
        } else {
          // Token is part of a single column field, change the token according to the feedback and add to the root pattern
          appendToken(
            pickValidPattern(match.grok_components[0], token.pattern, token.values),
            match.name
          );
        }
      } else {
        // Token is a field but did not get reviewed, keep as is and add the token to the current pattern definition
        appendToken(token.pattern, token.id);
      }
    } else {
      // Token is a separator character, keep as is and add to the current pattern definition
      appendToken(token.pattern, token.id);
    }
  });

  return {
    description: reviewResult.log_source,
    patterns: [rootPattern],
    pattern_definitions: patternDefinitions,
  };
}
