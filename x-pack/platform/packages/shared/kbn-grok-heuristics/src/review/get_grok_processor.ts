/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokPatternNode } from '../types';
import { GROK_REGEX_MAP } from '../constants';
import type { NormalizedReviewResult } from './get_review_fields';
import { sanitize, isCollapsiblePattern } from './get_review_fields';
import { isNamedField } from '../utils';

export interface GrokProcessorResult {
  description: string;
  patterns: string[];
  pattern_definitions?: Record<string, string>;
}

/**
 * Generates a GROK processor definition by combining extracted tokens and
 * the result of an LLM review. It constructs a root GROK pattern and
 * optionally defines custom pattern definitions for fields with multiple
 * columns, ensuring patterns are validated and adjusted based on example
 * values.
 */
export function getGrokProcessor(
  nodes: GrokPatternNode[],
  reviewResult: NormalizedReviewResult
): GrokProcessorResult {
  let rootPattern = '';
  const patternDefinitions: Record<string, string> = {};
  let targetDefinition: string | undefined;

  const appendNode = (node: GrokPatternNode) => {
    if (targetDefinition) {
      if (!patternDefinitions[targetDefinition]) {
        patternDefinitions[targetDefinition] = '';
      }
      patternDefinitions[targetDefinition] += isNamedField(node)
        ? `%{${node.component}}`
        : sanitize(node.pattern);
    } else {
      rootPattern += isNamedField(node)
        ? `%{${node.component}:${node.id}}`
        : sanitize(node.pattern);
    }
  };

  const pickValidPattern = (
    suggestedPattern: string,
    originalPattern: string,
    exampleValues: string[]
  ) => {
    // If the suggested pattern is a collapsible token, return the original pattern. These have been vetted by the heuristics to not be unecessarily greedy, something the LLM does not do well, so should not be changed
    if (isCollapsiblePattern(suggestedPattern)) {
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

  nodes.forEach((node) => {
    if (isNamedField(node)) {
      const match = reviewResult.fields.find((field) => field.columns.includes(node.id));
      if (match) {
        if (match.columns.length >= 2) {
          // Node is part of a group with multiple columns, create a custom pattern definition and add the token to it
          const index = match.columns.indexOf(node.id);
          const patternDefinitionName = `CUSTOM_${match.name
            .replace(/^(resource\.)?(attributes\.)?(custom_)?/g, '')
            .toUpperCase()
            .replace(/\W+/g, '_')
            .replace(/^_|_$/g, '')}`;

          if (index === 0) {
            appendNode({
              id: match.name,
              component: patternDefinitionName,
              values: [],
            });

            // Change destination to custom pattern destination
            targetDefinition = patternDefinitionName;
          }

          // Append the token to the current pattern definition
          appendNode({
            id: match.name,
            component: pickValidPattern(match.grok_components[index], node.component, node.values),
            values: node.values,
          });

          if (index === match.columns.length - 1) {
            // Change destination back after the last column
            targetDefinition = undefined;
          }
        } else {
          // Token is part of a single column field, change the token according to the feedback and add to the root pattern
          appendNode({
            id: match.name,
            component: pickValidPattern(match.grok_components[0], node.component, node.values),
            values: node.values,
          });
        }
      } else {
        // Token is a field but did not get reviewed, keep as is and add the token to the current pattern definition
        appendNode(node);
      }
    } else {
      // Token is a separator character, keep as is and add to the current pattern definition
      appendNode(node);
    }
  });

  return {
    description: reviewResult.log_source,
    patterns: [rootPattern],
    pattern_definitions: patternDefinitions,
  };
}
