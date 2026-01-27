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
 *
 * Special handling: Multi-column groupings that end with GREEDYDATA are
 * collapsed to a single GREEDYDATA field instead of creating a complex
 * custom pattern definition (since all preceding patterns are redundant).
 */
export function getGrokProcessor(
  nodes: GrokPatternNode[],
  reviewResult: NormalizedReviewResult
): GrokProcessorResult {
  // Identify which review field entries represent TRUE multi-column groupings
  // (where different columns are semantically grouped, like timestamp parts)
  // vs. entries that should be collapsed to GREEDYDATA
  const trueMultiColumnFields = new Set<string>();
  // Build skip ranges for collapsible multi-column groups
  // Map from field entry to range of node indices to skip
  const skipRanges: Array<{ start: number; end: number }> = [];

  // Track fields that should use GREEDYDATA (e.g., multi-column fields at the tail)
  const fieldsShouldBeGreedy = new Set<string>();

  // First pass: identify repeated field names that end with GREEDYDATA at the tail
  const fieldNameOccurrences = new Map<string, number[]>(); // fieldName -> array of field indices
  reviewResult.fields.forEach((field, fieldIndex) => {
    if (!fieldNameOccurrences.has(field.name)) {
      fieldNameOccurrences.set(field.name, []);
    }
    fieldNameOccurrences.get(field.name)!.push(fieldIndex);
  });

  // Check which repeated field names should be collapsed to GREEDYDATA
  fieldNameOccurrences.forEach((indices, fieldName) => {
    if (indices.length > 1) {
      // Check if the last occurrence is at the tail and ends with GREEDYDATA
      const lastFieldIndex = indices[indices.length - 1];
      const lastField = reviewResult.fields[lastFieldIndex];

      const lastColIndex = nodes.findIndex(
        (n) => isNamedField(n) && n.id === lastField.columns[lastField.columns.length - 1]
      );
      const lastNamedFieldIndex = nodes.reduce(
        (lastIndex, node, index) => (isNamedField(node) ? index : lastIndex),
        -1
      );
      const isAtTail = lastColIndex === lastNamedFieldIndex;
      const lastComponent = lastField.grok_components[lastField.grok_components.length - 1];
      const endsWithGreedy = lastComponent === 'GREEDYDATA';

      if (isAtTail && endsWithGreedy) {
        // Mark this field to use GREEDYDATA and skip all but the first occurrence
        fieldsShouldBeGreedy.add(fieldName);
      }
    }
  });

  // Track which fields we've already processed
  const seenFieldNames = new Set<string>();

  reviewResult.fields.forEach((field) => {
    // Check if this is a repeated field that should be collapsed
    if (seenFieldNames.has(field.name) && fieldsShouldBeGreedy.has(field.name)) {
      // Skip all subsequent occurrences
      const firstColIndex = nodes.findIndex((n) => isNamedField(n) && n.id === field.columns[0]);
      const lastColIndex = nodes.findIndex(
        (n) => isNamedField(n) && n.id === field.columns[field.columns.length - 1]
      );

      if (firstColIndex >= 0 && lastColIndex >= 0) {
        // Skip from firstColIndex to lastColIndex (inclusive)
        // Also skip any separators between this and the previous field
        const prevFieldLastCol = firstColIndex > 0 ? firstColIndex - 1 : firstColIndex;
        skipRanges.push({ start: prevFieldLastCol, end: lastColIndex });
      }
      return;
    }

    // Mark this field name as seen
    seenFieldNames.add(field.name);

    if (field.columns.length >= 2) {
      // If the last component is GREEDYDATA, all preceding patterns are redundant
      // This should be collapsed to a single GREEDYDATA, not a custom pattern definition
      const lastComponent = field.grok_components[field.grok_components.length - 1];
      if (lastComponent === 'GREEDYDATA') {
        // This multi-column entry should collapse - find the range to skip
        const firstColIndex = nodes.findIndex((n) => isNamedField(n) && n.id === field.columns[0]);
        const lastColIndex = nodes.findIndex(
          (n) => isNamedField(n) && n.id === field.columns[field.columns.length - 1]
        );

        if (firstColIndex >= 0 && lastColIndex >= 0 && lastColIndex > firstColIndex) {
          // Skip everything from firstColIndex+1 to lastColIndex (inclusive)
          skipRanges.push({ start: firstColIndex + 1, end: lastColIndex });
        }
      } else {
        // Check if this multi-column field is at the tail (end) of the pattern
        // If so, simplify to GREEDYDATA (samples are too homogenous)
        const lastColIndex = nodes.findIndex(
          (n) => isNamedField(n) && n.id === field.columns[field.columns.length - 1]
        );
        const lastNamedFieldIndex = nodes.reduce(
          (lastIndex, node, index) => (isNamedField(node) ? index : lastIndex),
          -1
        );
        const isAtTail = lastColIndex === lastNamedFieldIndex;

        if (isAtTail) {
          // This is a multi-column field at the tail - force to GREEDYDATA
          fieldsShouldBeGreedy.add(field.name);
          const firstColIndex = nodes.findIndex(
            (n) => isNamedField(n) && n.id === field.columns[0]
          );

          if (firstColIndex >= 0 && lastColIndex >= 0 && lastColIndex > firstColIndex) {
            // Skip everything from firstColIndex+1 to lastColIndex (inclusive)
            skipRanges.push({ start: firstColIndex + 1, end: lastColIndex });
          }
        } else {
          // Otherwise, it's a true multi-column grouping (e.g., timestamp parts)
          field.columns.forEach((col) => trueMultiColumnFields.add(col));
        }
      }
    }
  });

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

  nodes.forEach((node, index) => {
    // Check if this node should be skipped (part of collapsed multi-column group)
    const shouldSkip = skipRanges.some((range) => index >= range.start && index <= range.end);
    if (shouldSkip) {
      return;
    }

    if (isNamedField(node)) {
      const match = reviewResult.fields.find(
        (field) => field.columns.includes(node.id) || field.name === node.id
      );

      if (match) {
        const isPartOfMultiColumnGroup = trueMultiColumnFields.has(node.id);
        const isCollapsibleMultiColumn = match.columns.length >= 2 && !isPartOfMultiColumnGroup;
        const shouldForceGreedy = fieldsShouldBeGreedy.has(match.name);

        if (shouldForceGreedy) {
          // This field has repeated names - force to GREEDYDATA
          appendNode({
            id: match.name,
            component: 'GREEDYDATA',
            values: node.values,
          });
        } else if (isCollapsibleMultiColumn) {
          // Multi-column entry that should collapse to GREEDYDATA
          // Output GREEDYDATA for the first column
          // (subsequent columns and separators are skipped via skipRanges)
          appendNode({
            id: match.name,
            component: 'GREEDYDATA',
            values: node.values,
          });
        } else if (isPartOfMultiColumnGroup) {
          // Node is part of a true multi-column grouping, create a custom pattern definition
          const colIndex = match.columns.indexOf(node.id);
          const patternDefinitionName = `CUSTOM_${match.name
            .replace(/^(resource\.)?(attributes\.)?(custom_)?/g, '')
            .toUpperCase()
            .replace(/\W+/g, '_')
            .replace(/^_|_$/g, '')}`;

          if (colIndex === 0) {
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
            component: pickValidPattern(
              match.grok_components[colIndex],
              node.component,
              node.values
            ),
            values: node.values,
          });

          if (colIndex === match.columns.length - 1) {
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
