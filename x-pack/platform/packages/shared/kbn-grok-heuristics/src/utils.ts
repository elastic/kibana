/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokPatternNode, NamedFieldNode, LiteralValueNode } from './types';

/*
 * Type guard to check if a node is a NamedFieldNode.
 */
export function isNamedField(node: GrokPatternNode): node is NamedFieldNode {
  return 'id' in node;
}

/*
 * Type guard to check if a node is a LiteralValueNode.
 */
export function isLiteralValue(node: GrokPatternNode): node is LiteralValueNode {
  return !('id' in node);
}
