/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokPatternNode, NamedFieldNode } from '../types';
import { isNamedField } from '../utils';

/**
 * Collapses sequential nodes that have been named identically by the LLM.
 *
 * Unlike dissect's collapseRepeats which works with append modifiers and preserves
 * pattern structure, grok collapse upgrades sequential same-named fields to GREEDYDATA
 * for maximum permissiveness.
 *
 * When the LLM names multiple syntactically different fields with the same name
 * (e.g., all as "error.message"), it's recognizing they're semantically the same field.
 * By collapsing these into a single GREEDYDATA pattern, we get simpler, more robust patterns.
 *
 * Special optimization: If any field in a same-named sequence is already GREEDYDATA,
 * all preceding fields in that sequence are redundant (since GREEDYDATA captures everything).
 * In this case, collapse the entire sequence starting from the first field.
 *
 * Example 1 (basic collapse):
 * Input:  %{NOTSPACE:error.message}\s%{WORD:error.message}\s%{DATA:error.message}
 * Output: %{GREEDYDATA:error.message}
 *
 * Example 2 (GREEDYDATA optimization):
 * Input:  %{NOTSPACE:msg}\s%{WORD:msg}\s%{GREEDYDATA:msg}
 * Output: %{GREEDYDATA:msg}  (collapse from the start, not just the GREEDYDATA)
 *
 * @param nodes - Array of grok pattern nodes after LLM review
 * @returns Collapsed array with sequential same-named fields combined into GREEDYDATA
 */
export function collapseSequentialFields(nodes: GrokPatternNode[]): GrokPatternNode[] {
  const result: GrokPatternNode[] = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i];

    // Non-field nodes (literals/separators) pass through unchanged
    if (!isNamedField(node)) {
      result.push(node);
      i++;
      continue;
    }

    // Find sequence of consecutive same-named fields
    const sequence = findSequentialSameNamedFields(nodes, i);

    if (sequence.length > 1 || sequence.hasGreedyData) {
      // Collapse the sequence into a single GREEDYDATA field
      // If the sequence contains GREEDYDATA, all preceding patterns are redundant
      // Merge all example values from the sequence
      const mergedValues = sequence.nodes.flatMap((n: NamedFieldNode) => n.values);
      const uniqueValues: string[] = Array.from(new Set(mergedValues));

      result.push({
        id: node.id,
        component: 'GREEDYDATA',
        values: uniqueValues,
      });

      // Preserve the separator after the last field in the sequence (if exists)
      if (sequence.endIndex < nodes.length && !isNamedField(nodes[sequence.endIndex])) {
        result.push(nodes[sequence.endIndex]);
        i = sequence.endIndex + 1;
      } else {
        i = sequence.endIndex;
      }
    } else {
      // Single field, no collapse needed
      result.push(node);
      i++;
    }
  }

  return result;
}

/**
 * Finds a sequence of consecutive fields with the same name.
 * The endIndex points to the position right after the last field in the sequence
 * (which might be a separator or the next different field).
 *
 * Also detects if any field in the sequence is GREEDYDATA, which means all
 * preceding fields are redundant and should be collapsed.
 *
 * @param nodes - All nodes
 * @param startIndex - Index to start searching from
 * @returns Object containing the sequence of fields, end index, and GREEDYDATA flag
 */
function findSequentialSameNamedFields(
  nodes: GrokPatternNode[],
  startIndex: number
): {
  length: number;
  endIndex: number;
  nodes: NamedFieldNode[];
  hasGreedyData: boolean;
} {
  if (startIndex >= nodes.length || !isNamedField(nodes[startIndex])) {
    return { length: 0, endIndex: startIndex, nodes: [], hasGreedyData: false };
  }

  const startNode = nodes[startIndex] as NamedFieldNode;
  const fieldName = startNode.id;
  const sequence: NamedFieldNode[] = [startNode];
  let hasGreedyData = startNode.component === 'GREEDYDATA';
  let index = startIndex + 1;

  while (index < nodes.length) {
    const currentNode = nodes[index];

    // Skip over literal separators between same-named fields
    if (!isNamedField(currentNode)) {
      // Look ahead past all separators to find the next field
      let lookAheadIndex = index + 1;
      while (lookAheadIndex < nodes.length && !isNamedField(nodes[lookAheadIndex])) {
        lookAheadIndex++;
      }

      // Check if there's another field with the same name after all these separators
      if (
        lookAheadIndex < nodes.length &&
        isNamedField(nodes[lookAheadIndex]) &&
        (nodes[lookAheadIndex] as NamedFieldNode).id === fieldName
      ) {
        // There's another same-named field after these separators, skip them all
        index++;
        continue;
      } else {
        // No more same-named fields, stop here
        break;
      }
    }

    // Check if this is another instance of the same field
    if (currentNode.id === fieldName) {
      sequence.push(currentNode as NamedFieldNode);
      if (currentNode.component === 'GREEDYDATA') {
        hasGreedyData = true;
      }
      index++;
    } else {
      // Different field name - end of sequence
      break;
    }
  }

  return {
    length: sequence.length,
    endIndex: index,
    nodes: sequence,
    hasGreedyData,
  };
}
