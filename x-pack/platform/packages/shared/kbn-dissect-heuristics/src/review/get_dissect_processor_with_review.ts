/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DissectPattern,
  DissectProcessorResult,
  DissectField,
  DissectAST,
  DissectASTNode,
  DissectFieldNode,
} from '../types';
import type { NormalizedReviewResult } from './get_review_fields';
import { collapseRepeats } from './collapse_repeats';
import { serializeAST } from '../serialize_ast';

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

  // Transform the AST with ECS field names and handle grouping
  const transformedAST = transformASTWithReview(
    pattern.ast,
    fieldNameMap,
    staticFieldMap,
    fieldGroupMap,
    joinStrategyMap
  );

  // Collapse repeated field sequences
  const collapsedAST = collapseRepeats(transformedAST);

  // Serialize to pattern string
  const finalPattern = serializeAST(collapsedAST);

  // Build new fields list
  const newFields: DissectField[] = [];
  const processedGroups = new Set<string>();

  pattern.fields.forEach((field) => {
    const ecsFieldName = fieldNameMap.get(field.name);
    const staticValue = staticFieldMap.get(field.name);

    // Skip static fields (they're now literals in the pattern)
    if (staticValue !== undefined) {
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

        processedGroups.add(ecsFieldName);
      }
    } else {
      // Single-column field, just rename it
      newFields.push({
        ...field,
        name: ecsFieldName,
      });
    }
  });

  // Check if any field uses append strategy
  const usesAppend = reviewResult.fields.some((field) => field.join_strategy === 'append');

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

/**
 * Transform AST nodes based on review result
 * Replaces field names with ECS names, converts static fields to literals,
 * and adds append modifiers for grouped fields
 */
function transformASTWithReview(
  ast: DissectAST,
  fieldNameMap: Map<string, string>,
  staticFieldMap: Map<string, string>,
  fieldGroupMap: Map<string, string[]>,
  joinStrategyMap: Map<string, 'append' | 'skip'>
): DissectAST {
  const processedGroups = new Set<string>();
  const transformedNodes: DissectASTNode[] = [];

  for (let i = 0; i < ast.nodes.length; i++) {
    const node = ast.nodes[i];

    if (node.type === 'literal') {
      transformedNodes.push(node);
      continue;
    }

    // Field node
    const fieldNode = node as DissectFieldNode;
    const originalName = fieldNode.name;
    const staticValue = staticFieldMap.get(originalName);

    // Convert static fields to literals
    if (staticValue !== undefined) {
      transformedNodes.push({
        type: 'literal',
        value: staticValue,
      });
      continue;
    }

    const ecsFieldName = fieldNameMap.get(originalName);

    if (!ecsFieldName) {
      // Field not mapped, keep original
      transformedNodes.push(fieldNode);
      continue;
    }

    const fieldGroup = fieldGroupMap.get(ecsFieldName);

    if (fieldGroup && fieldGroup.length > 1) {
      // This is part of a multi-column group
      const joinStrategy = joinStrategyMap.get(ecsFieldName)!;
      const fieldIndex = fieldGroup.indexOf(originalName);

      if (joinStrategy === 'append') {
        // All fields in the group use append modifier
        transformedNodes.push({
          type: 'field',
          name: ecsFieldName,
          modifiers: {
            ...fieldNode.modifiers,
            append: true,
          },
        });
      } else {
        // skip strategy: first field gets the name, rest become empty skip fields
        if (fieldIndex === 0) {
          transformedNodes.push({
            type: 'field',
            name: ecsFieldName,
            modifiers: fieldNode.modifiers,
          });
        } else {
          transformedNodes.push({
            type: 'field',
            name: '',
            modifiers: {
              skip: true,
            },
          });
        }
      }
    } else {
      // Single-column field, just rename it
      transformedNodes.push({
        type: 'field',
        name: ecsFieldName,
        modifiers: fieldNode.modifiers,
      });
    }
  }

  return { nodes: transformedNodes };
}
