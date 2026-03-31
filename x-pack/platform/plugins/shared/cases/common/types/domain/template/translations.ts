/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FIELD_OPTIONS_MUST_BE_UNIQUE = i18n.translate(
  'xpack.cases.templates.fieldSchema.optionsMustBeUnique',
  {
    defaultMessage: 'Options must be unique.',
  }
);

export const FIELD_DEFAULT_VALUES_MUST_BE_UNIQUE = i18n.translate(
  'xpack.cases.templates.fieldSchema.defaultValuesMustBeUnique',
  {
    defaultMessage: 'Default values must be unique.',
  }
);

export const FIELD_OPTIONS_MAX_ITEMS = (max: number) =>
  i18n.translate('xpack.cases.templates.fieldSchema.optionsMaxItems', {
    values: { max },
    defaultMessage: 'Options must not exceed {max} items.',
  });

export const FIELD_OPTIONS_MIN_ITEMS = (min: number) =>
  i18n.translate('xpack.cases.templates.fieldSchema.optionsMinItems', {
    values: { min },
    defaultMessage: 'Options must have at least {min} items.',
  });

export const FIELD_DEFAULT_NOT_IN_OPTIONS = i18n.translate(
  'xpack.cases.templates.fieldSchema.defaultNotInOptions',
  {
    defaultMessage: 'Default must be one of the options.',
  }
);
