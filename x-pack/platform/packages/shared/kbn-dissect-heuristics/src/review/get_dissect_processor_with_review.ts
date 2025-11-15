/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectPattern, DissectProcessorResult, DissectField } from '../types';
import type { NormalizedReviewResult } from './get_review_fields';
import { collapseTrailingRepeats } from './collapse_trailing_repeats';

/**
 * Generates a Dissect processor by combining extracted pattern and
 * the result of an LLM review. It replaces generic field names (field_1, field_2, etc.)
 * with ECS-compliant field names and handles field grouping.
 */
export function getDissectProcessorWithReview(
  pattern: DissectPattern,
  reviewResult: NormalizedReviewResult,
  sourceField: string = 'message'
): DissectProcessorResult {
  // Build a mapping from original field names to ECS field names
  const fieldNameMap = new Map<string, string>();
  const fieldGroupMap = new Map<string, string[]>();

  reviewResult.fields.forEach((field) => {
    field.columns.forEach((columnName) => {
      fieldNameMap.set(columnName, field.ecs_field);
    });
    if (field.columns.length > 1) {
      fieldGroupMap.set(field.ecs_field, field.columns);
    }
  });

  // Track join strategies for multi-column fields
  const joinStrategyMap = new Map<string, 'append' | 'skip'>();
  reviewResult.fields.forEach((field) => {
    if (field.columns.length > 1 && field.join_strategy) {
      joinStrategyMap.set(field.ecs_field, field.join_strategy);
    }
  });

  // Track static fields that should be inlined as literals
  const staticFieldMap = new Map<string, string>();
  reviewResult.fields.forEach((field) => {
    if (field.is_static && field.static_value) {
      field.columns.forEach((columnName) => {
        const dissectField = pattern.fields.find((f) => f.name === columnName);
        if (dissectField?.modifiers?.rightPadding) {
          // If the field has right padding, we cannot inline it as a static value
          return;
        }
        staticFieldMap.set(columnName, field.static_value!);
      });
    }
  });

  // Reconstruct the pattern with ECS field names
  let newPattern = pattern.pattern;
  const newFields: DissectField[] = [];
  const processedGroups = new Set<string>();

  pattern.fields.forEach((field) => {
    const ecsFieldName = fieldNameMap.get(field.name);
    const staticValue = staticFieldMap.get(field.name);

    // If this is a static field, replace it with a literal value
    if (staticValue !== undefined) {
      const escapedName = field.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const fieldPattern = new RegExp(`%\\{${escapedName}(->|\\?)?\\}`, 'g');
      newPattern = newPattern.replace(fieldPattern, staticValue);
      // Don't add to newFields since it's now a literal
      return;
    }

    if (!ecsFieldName) {
      // Field not mapped by LLM, keep original
      newFields.push(field);
      return;
    }

    const fieldGroup = fieldGroupMap.get(ecsFieldName);

    if (fieldGroup && fieldGroup.length > 1) {
      // This field is part of a multi-column group
      if (!processedGroups.has(ecsFieldName)) {
        const joinStrategy = joinStrategyMap.get(ecsFieldName)!;

        // First field in the group - create the combined field
        const groupFields = pattern.fields.filter((f) => fieldGroup.includes(f.name));
        const combinedValues = groupFields.map((f) => f.values);

        // Combine values from all fields in the group
        const mergedValues: string[] = [];
        for (let i = 0; i < Math.max(...combinedValues.map((v) => v.length)); i++) {
          const parts: string[] = [];
          combinedValues.forEach((values) => {
            if (values[i] !== undefined) {
              parts.push(values[i]);
            }
          });
          if (parts.length > 0) {
            mergedValues.push(parts.join(' '));
          }
        }

        newFields.push({
          name: ecsFieldName,
          values: mergedValues,
          position: field.position,
          modifiers: field.modifiers,
        });

        // Replace all field references in the pattern based on join strategy
        fieldGroup.forEach((originalName, index) => {
          const escapedName = originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const fieldPattern = new RegExp(`%\\{${escapedName}(->|\\?)?\\}`, 'g');

          if (joinStrategy === 'append') {
            // All fields use append modifier to join values
            newPattern = newPattern.replace(fieldPattern, (match) => {
              const modifier = match.includes('->') ? '->' : '';
              return `%{+${ecsFieldName}${modifier}}`;
            });
          } else {
            // skip strategy: first field gets the name, rest become empty skip fields
            if (index === 0) {
              newPattern = newPattern.replace(fieldPattern, (match) => {
                const modifier = match.includes('->') ? '->' : match.includes('?') ? '?' : '';
                return `%{${ecsFieldName}${modifier}}`;
              });
            } else {
              newPattern = newPattern.replace(fieldPattern, '%{}');
            }
          }
        });

        processedGroups.add(ecsFieldName);
      }
    } else {
      // Single-column field, just rename it
      const escapedName = field.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const fieldPattern = new RegExp(`%\\{${escapedName}(->|\\?)?\\}`, 'g');

      newPattern = newPattern.replace(fieldPattern, (match) => {
        const modifier = match.includes('->') ? '->' : match.includes('?') ? '?' : '';
        return `%{${ecsFieldName}${modifier}}`;
      });

      newFields.push({
        ...field,
        name: ecsFieldName,
      });
    }
  });

  // Check if any field uses append strategy
  const usesAppend = reviewResult.fields.some((field) => field.join_strategy === 'append');

  // Collapse any repeated append fields at the end of the pattern
  const finalPattern = collapseTrailingRepeats(newPattern);

  const dissectConfig: {
    field: string;
    pattern: string;
    ignore_missing: boolean;
    append_separator?: string;
  } = {
    field: sourceField,
    pattern: finalPattern,
    ignore_missing: true,
  };

  // Add append_separator if any field uses append strategy
  if (usesAppend) {
    dissectConfig.append_separator = ' ';
  }

  return {
    description: reviewResult.log_source,
    pattern: finalPattern,
    processor: {
      dissect: dissectConfig,
    },
    metadata: {
      messageCount: pattern.fields[0]?.values.length ?? 0,
      fieldCount: newFields.length,
    },
  };
}
