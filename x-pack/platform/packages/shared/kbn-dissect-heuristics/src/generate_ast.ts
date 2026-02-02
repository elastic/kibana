/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DelimiterNode, DissectField, DissectAST, DissectFieldNode } from './types';

/**
 * Generate a Dissect AST from delimiters and fields
 *
 * Algorithm:
 * 1. Interleave delimiters and fields in order
 * 2. Create appropriate AST nodes with modifiers
 * 3. Handle edge cases (no delimiters, fields before first delimiter)
 *
 * @param delimiterTree - Array of delimiter nodes
 * @param fields - Array of dissect fields
 * @returns DissectAST
 */
export function generateAST(delimiterTree: DelimiterNode[], fields: DissectField[]): DissectAST {
  if (fields.length === 0) {
    return { nodes: [] };
  }

  // If no delimiters, return single field
  if (delimiterTree.length === 0) {
    return {
      nodes: [fieldToNode(fields[0])],
    };
  }

  const nodes: DissectAST['nodes'] = [];
  let fieldIndex = 0;

  // Check if there's a field before the first delimiter
  const firstDelimiter = delimiterTree[0];
  if (fields[0] && fields[0].position < firstDelimiter.medianPosition) {
    nodes.push(fieldToNode(fields[fieldIndex]));
    fieldIndex++;
  }

  // Interleave delimiters and fields
  for (let i = 0; i < delimiterTree.length; i++) {
    const delimiter = delimiterTree[i];

    // Add delimiter as literal node
    nodes.push({
      type: 'literal',
      value: delimiter.literal,
    });

    // Add field after this delimiter (if exists)
    if (fieldIndex < fields.length) {
      nodes.push(fieldToNode(fields[fieldIndex]));
      fieldIndex++;
    }
  }

  return { nodes };
}

/**
 * Convert a DissectField to a DissectFieldNode
 */
function fieldToNode(field: DissectField): DissectFieldNode {
  return {
    type: 'field',
    name: field.name,
    modifiers: field.modifiers,
  };
}
