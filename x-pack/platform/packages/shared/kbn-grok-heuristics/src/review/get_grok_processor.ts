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
import { collapseSequentialFields } from './collapse_sequential_fields';

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
 *
 * After the LLM review renames fields, sequential fields with the same name
 * are collapsed into a single GREEDYDATA field to simplify the pattern.
 */
export function getGrokProcessor(
  nodes: GrokPatternNode[],
  reviewResult: NormalizedReviewResult
): GrokProcessorResult {
  // Identify which review field entries represent TRUE multi-column groupings
  // (where different columns are semantically grouped, like timestamp parts)
  // vs. entries that should be collapsed to GREEDYDATA
  const trueMultiColumnFields = new Set<string>();
  reviewResult.fields.forEach((field) => {
    if (field.columns.length >= 2) {
      // If the last component is GREEDYDATA, all preceding patterns are redundant
      // This should be collapsed to a single GREEDYDATA, not a custom pattern definition
      const lastComponent = field.grok_components[field.grok_components.length - 1];
      if (lastComponent === 'GREEDYDATA') {
        return; // Skip this entry - will be treated as collapsible
      }

      // Otherwise, it's a true multi-column grouping (e.g., timestamp parts)
      field.columns.forEach((col) => trueMultiColumnFields.add(col));
    }
  });

  // Apply LLM field renaming
  const renamedNodes = nodes.map((node) => {
    if (isNamedField(node)) {
      // Skip renaming if this field is part of a true multi-column mapping
      if (trueMultiColumnFields.has(node.id)) {
        return node;
      }

      const match = reviewResult.fields.find((field) => field.columns.includes(node.id));
      if (match) {
        // Rename to the LLM-suggested name
        return {
          ...node,
          id: match.name,
        };
      }
    }
    return node;
  });

  // Collapse sequential fields with the same name into GREEDYDATA
  const collapsedNodes = collapseSequentialFields(renamedNodes);

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

  collapsedNodes.forEach((node) => {
    if (isNamedField(node)) {
      const match = reviewResult.fields.find(
        (field) => field.columns.includes(node.id) || field.name === node.id
      );

      if (match) {
        // Check if this node's original ID is part of a true multi-column grouping
        const isPartOfMultiColumnGroup = trueMultiColumnFields.has(node.id);

        if (isPartOfMultiColumnGroup) {
          // Node is part of a true multi-column grouping, create a custom pattern definition
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
          // Single-column field or collapsed field
          // If collapsed, component will be GREEDYDATA; otherwise use LLM suggestion
          const shouldPreserveComponent = node.component === 'GREEDYDATA';
          const componentIndex = match.columns.indexOf(node.id);

          appendNode({
            id: match.name,
            component: shouldPreserveComponent
              ? 'GREEDYDATA'
              : pickValidPattern(
                  match.grok_components[componentIndex >= 0 ? componentIndex : 0],
                  node.component,
                  node.values
                ),
            values: node.values,
          });
        }
      } else {
        // Token is a field but did not get reviewed, keep as is
        appendNode(node);
      }
    } else {
      // Token is a separator character, keep as is
      appendNode(node);
    }
  });

  return {
    description: reviewResult.log_source,
    patterns: [rootPattern],
    pattern_definitions: patternDefinitions,
  };
}
