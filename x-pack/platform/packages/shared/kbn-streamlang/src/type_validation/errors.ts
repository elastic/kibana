/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveType } from './types';

/**
 * Error thrown when a field has different types assigned conditionally.
 * Types can change unconditionally (e.g., always convert string to number),
 * but cannot have different types in different conditional branches.
 */
export class ConditionalTypeChangeError extends Error {
  constructor(
    public field: string,
    public types: PrimitiveType[],
    public processorIndices: number[],
    public customIdentifiers: Array<string | undefined>
  ) {
    const identifierInfo = customIdentifiers.some((id) => id)
      ? ` (processors: ${customIdentifiers
          .map((id, i) => id || `index ${processorIndices[i]}`)
          .join(', ')})`
      : ` at processors ${processorIndices.join(', ')}`;

    super(
      `Field '${field}' has conditional type changes: ` +
        `types ${types.map((t) => `'${t}'`).join(', ')}` +
        identifierInfo +
        `. Types can only change unconditionally (outside conditional blocks).`
    );
    this.name = 'ConditionalTypeChangeError';
    Object.setPrototypeOf(this, ConditionalTypeChangeError.prototype);
  }
}
