/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SchemaPropertyNameError } from './types';

/** The text shown under a property name field for a failed name check. */
export const schemaPropertyNameErrorMessage = (
  error: SchemaPropertyNameError | null
): string | undefined => {
  switch (error) {
    case 'empty':
      return i18n.translate('workflows.schemaPropertyBuilder.nameEmpty', {
        defaultMessage: 'Name is required.',
      });
    case 'invalid':
      return i18n.translate('workflows.schemaPropertyBuilder.nameInvalid', {
        defaultMessage: 'Use letters, digits, or underscore; cannot start with a digit.',
      });
    case 'duplicate':
      return i18n.translate('workflows.schemaPropertyBuilder.nameDuplicate', {
        defaultMessage: 'Name must be unique among siblings.',
      });
    case 'reserved':
      return i18n.translate('workflows.schemaPropertyBuilder.nameReserved', {
        defaultMessage: 'This name is reserved and cannot be used.',
      });
    default:
      return undefined;
  }
};
