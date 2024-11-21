/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { StorageSchema } from '..';

export class IncompatibleSchemaUpdateError extends Error {
  constructor({
    existingProperties,
    incompatibleProperties,
    missingProperties,
    nextProperties,
  }: {
    existingProperties: Record<string, MappingProperty>;
    nextProperties: StorageSchema['properties'];
    missingProperties: string[];
    incompatibleProperties: string[];
  }) {
    const missingErrorMessage = missingProperties.length
      ? `\nmissing properties: ${missingProperties.join(', ')}`
      : '';

    const incompatibleErrorMessage = incompatibleProperties.length
      ? `\nincompatible properties:
      
      ${incompatibleProperties
        .map((property) => {
          return `\t${property}: expected ${existingProperties[property].type}, but got ${nextProperties[property].type}`;
        })
        .join('\n')}`
      : '';

    super(`Incompatible schema update: ${missingErrorMessage} ${incompatibleErrorMessage}`);
  }
}
