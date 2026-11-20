/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { validateSchemaPropertyName } from '../../../shared/ui/schema_property_builder';

export const settingsEntryNameErrorMessage = (
  error: ReturnType<typeof validateSchemaPropertyName>
): string | undefined => {
  if (error === 'empty') {
    return i18n.translate('workflows.schemaPropertyBuilder.nameEmpty', {
      defaultMessage: 'Name is required.',
    });
  }
  if (error === 'invalid') {
    return i18n.translate('workflows.schemaPropertyBuilder.nameInvalid', {
      defaultMessage: 'Use letters, digits, or underscore; cannot start with a digit.',
    });
  }
  if (error === 'duplicate') {
    return i18n.translate('workflows.schemaPropertyBuilder.nameDuplicate', {
      defaultMessage: 'Name must be unique among siblings.',
    });
  }
  return undefined;
};
