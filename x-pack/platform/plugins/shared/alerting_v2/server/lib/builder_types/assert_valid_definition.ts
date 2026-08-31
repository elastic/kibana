/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredBuilderType } from './types';

/**
 * Structural sanity checks for a builder type definition. Throws so a
 * misconfigured plugin fails at setup rather than at request time.
 */
export function assertValidDefinition(definition: RegisteredBuilderType): void {
  if (typeof definition.type !== 'string' || definition.type.trim().length === 0) {
    throw new Error('Builder type definition requires a non-empty type');
  }

  if (definition.builderFieldsSchema == null) {
    throw new Error(`Builder type "${definition.type}" requires a builderFieldsSchema`);
  }

  if (typeof definition.generateQuery !== 'function') {
    throw new Error(`Builder type "${definition.type}" requires a generateQuery function`);
  }
}
