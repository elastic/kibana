/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectAST, DissectFieldNode } from './types';

/**
 * Serialize a Dissect AST to a pattern string
 *
 * @param ast - The Dissect AST to serialize
 * @returns The dissect pattern string
 */
export function serializeAST(ast: DissectAST): string {
  if (!ast || !ast.nodes) {
    return '';
  }

  return ast.nodes
    .map((node) => {
      if (node.type === 'literal') {
        return node.value;
      }
      return formatFieldNode(node);
    })
    .join('');
}

/**
 * Format a field node into Dissect syntax
 */
function formatFieldNode(node: DissectFieldNode): string {
  const modifiers = node.modifiers || {};

  // Handle skip fields
  if (modifiers.skip) {
    if (modifiers.namedSkip) {
      return `%{?${node.name}}`;
    }
    return '%{}';
  }

  // Build modifier string
  let modifierStr = '';
  if (modifiers.append) {
    modifierStr += '+';
  }

  const fieldPart = `${modifierStr}${node.name}`;

  // Handle right padding
  if (modifiers.rightPadding) {
    return `%{${fieldPart}->}`;
  }

  // Standard field
  return `%{${fieldPart}}`;
}
