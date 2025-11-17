/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectAST, DissectASTNode, DissectFieldNode } from '../types';

/**
 * Collapse repeated field sequences in a dissect pattern AST
 *
 * Rules:
 * 1. Middle repeats: If the same field repeats consecutively with the same delimiter
 *    between them AND there's another delimiter after the group, collapse them
 * 2. Trailing repeats: If the tail end has N repetitions of the same field,
 *    collapse all of them regardless of separators
 *
 * @param ast - The Dissect AST to process
 * @returns Modified AST with collapsed repeats
 */
export function collapseRepeats(ast: DissectAST): DissectAST {
  let nodes = [...ast.nodes];

  // First, collapse trailing repeats
  nodes = collapseTrailingRepeats(nodes);

  // Then, collapse middle repeats
  nodes = collapseMiddleRepeats(nodes);

  return { nodes };
}

/**
 * Identify and collapse trailing repeating fields
 *
 * Pattern to match:
 * - ... field_X delimiter field_X delimiter field_X
 * - Collapse to: ... field_X (remove delimiters and repeated fields)
 */
function collapseTrailingRepeats(nodes: DissectASTNode[]): DissectASTNode[] {
  if (nodes.length < 2) {
    return nodes;
  }

  // Find the last field node
  let lastFieldIndex = -1;
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].type === 'field') {
      lastFieldIndex = i;
      break;
    }
  }

  if (lastFieldIndex === -1) {
    return nodes;
  }

  const lastField = nodes[lastFieldIndex] as DissectFieldNode;
  const fieldName = lastField.name;

  // Find where the repeating sequence starts by walking backwards
  let sequenceStart = lastFieldIndex;
  let i = lastFieldIndex - 1;

  while (i >= 0) {
    const node = nodes[i];

    if (node.type === 'literal') {
      // Skip the delimiter
      i--;
      continue;
    }

    if (node.type === 'field') {
      const field = node as DissectFieldNode;
      if (field.name === fieldName) {
        // Found another occurrence of the same field
        sequenceStart = i;
        i--;
      } else {
        // Different field, stop here
        break;
      }
    } else {
      break;
    }
  }

  // If sequenceStart is different from lastFieldIndex, we found repeats
  if (sequenceStart < lastFieldIndex) {
    // Keep everything before the sequence starts
    const result = nodes.slice(0, sequenceStart);

    // Check if this field appears elsewhere (before the collapsed section)
    const appearsElsewhere = result.some(
      (node) => node.type === 'field' && (node as DissectFieldNode).name === fieldName
    );

    // Add the final field, removing append modifier if it's unique now
    const finalField: DissectFieldNode = {
      ...lastField,
      modifiers: {
        ...lastField.modifiers,
        append: appearsElsewhere ? lastField.modifiers?.append : undefined,
      },
    };

    result.push(finalField);
    return result;
  }

  return nodes;
}

/**
 * Identify and collapse middle repeating sequences
 *
 * Pattern to match:
 * - field_X delimiter_A field_X delimiter_A field_X delimiter_B
 * - Or: named_field delimiter skip_field delimiter skip_field delimiter_B
 * - Collapse to: field_X delimiter_B (removing all repeated fields and delimiters)
 */
function collapseMiddleRepeats(nodes: DissectASTNode[]): DissectASTNode[] {
  if (nodes.length < 5) {
    return nodes; // Need at least: field, delim, field, delim, delim to collapse
  }

  const result: DissectASTNode[] = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i];

    if (node.type === 'field') {
      const field = node as DissectFieldNode;

      // Try to find a repeating pattern starting here
      const sequence = findRepeatSequence(nodes, i);

      if (sequence && sequence.repeatCount > 1 && sequence.hasFollowingDelimiter) {
        // Found a collapsible sequence
        // Keep the first field as-is (it already has the right modifiers from transformASTWithReview)
        result.push(field);

        // Add the following delimiter (the different one that marks the end)
        result.push(nodes[sequence.end]);

        // Skip past both the repeated sequence AND the following delimiter
        i = sequence.end + 1;
      } else {
        // Not a repeating sequence, just add the node
        result.push(node);
        i++;
      }
    } else {
      result.push(node);
      i++;
    }
  }

  return result;
}

/**
 * Find a repeating sequence starting at index
 * Returns null if no valid sequence found
 *
 * Handles two patterns:
 * 1. Same named field repeated: field_X delim field_X delim field_X
 * 2. Named field followed by skip fields: field_X delim %{?} delim %{?}
 */
function findRepeatSequence(
  nodes: DissectASTNode[],
  startIndex: number
): { repeatCount: number; end: number; hasFollowingDelimiter: boolean } | null {
  if (startIndex >= nodes.length || nodes[startIndex].type !== 'field') {
    return null;
  }

  const firstField = nodes[startIndex] as DissectFieldNode;
  const fieldName = firstField.name;

  // Check if there's at least: field, literal, field
  if (startIndex + 2 >= nodes.length) {
    return null;
  }

  if (nodes[startIndex + 1].type !== 'literal') {
    return null;
  }

  const repeatDelimiter = (nodes[startIndex + 1] as { type: 'literal'; value: string }).value;

  // Check what the second field is to determine the pattern type
  const secondField = nodes[startIndex + 2];
  if (secondField.type !== 'field') {
    return null;
  }

  const secondFieldNode = secondField as DissectFieldNode;
  const isSkipPattern = secondFieldNode.modifiers?.skip === true || secondFieldNode.name === '';

  // Count how many times the pattern repeats: field + delimiter
  let repeatCount = 1;
  let currentIndex = startIndex + 2;

  while (currentIndex < nodes.length) {
    // Check if next node is a field
    if (nodes[currentIndex].type !== 'field') {
      break;
    }

    const currentField = nodes[currentIndex] as DissectFieldNode;

    // For skip patterns, skip fields continue the sequence
    // For named patterns, must match the exact name
    const isMatchingField = isSkipPattern
      ? currentField.modifiers?.skip === true || currentField.name === ''
      : currentField.name === fieldName;

    if (!isMatchingField) {
      break;
    }

    repeatCount++;
    currentIndex++;

    // Check if there's a delimiter after this field
    if (currentIndex >= nodes.length) {
      break;
    }

    if (nodes[currentIndex].type !== 'literal') {
      break;
    }

    const currentDelimiter = (nodes[currentIndex] as { type: 'literal'; value: string }).value;

    // If this is the same delimiter, continue the sequence
    if (currentDelimiter === repeatDelimiter) {
      currentIndex++;
      continue;
    } else {
      // Different delimiter - this marks the end of the sequence
      // This is the "following delimiter" we need
      return {
        repeatCount,
        end: currentIndex,
        hasFollowingDelimiter: true,
      };
    }
  }

  // Reached end without finding a different delimiter
  return null;
}
