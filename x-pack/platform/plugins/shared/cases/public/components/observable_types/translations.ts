/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const TITLE = i18n.translate('xpack.cases.observableTypes.title', {
  defaultMessage: 'Observable types',
});

export const DESCRIPTION = i18n.translate('xpack.cases.observableTypes.description', {
  defaultMessage: 'Add observable types for customized case collaboration.',
});

export const NO_OBSERVABLE_TYPES = i18n.translate('xpack.cases.observableTypes.noObservableTypes', {
  defaultMessage: 'You do not have any observable types yet',
});

export const ADD_OBSERVABLE_TYPE = i18n.translate('xpack.cases.observableTypes.addObservableType', {
  defaultMessage: 'Add observable type',
});

export const OBSERVABLE_TYPE_LABEL = i18n.translate('xpack.cases.observableTypes.fieldLabel', {
  defaultMessage: 'Observable type label',
});

export const REQUIRED_FIELD = (fieldName: string): string =>
  i18n.translate('xpack.cases.observableTypes.requiredField', {
    values: { fieldName },
    defaultMessage: '{fieldName} is required.',
  });

export const DELETE_OBSERVABLE_TYPE_TITLE = (fieldName: string) =>
  i18n.translate('xpack.cases.observableTypes.deleteField', {
    values: { fieldName },
    defaultMessage: 'Delete observable type "{fieldName}"?',
  });

export const DELETE_OBSERVABLE_TYPE_DESCRIPTION = i18n.translate(
  'xpack.cases.observableTypes.deleteObservableTypeDescription',
  {
    defaultMessage: 'The observable type will be removed from all cases and data will be lost.',
  }
);

export const DELETE = i18n.translate('xpack.cases.observableTypes.options.Delete', {
  defaultMessage: 'Delete',
});

export const MAX_OBSERVABLE_TYPES_LIMIT = (maxObservableTypesLimit: number) =>
  i18n.translate('xpack.cases.observableTypes.maxObservableTypesLimit', {
    values: { maxObservableTypesLimit },
    defaultMessage: 'Maximum number of {maxObservableTypesLimit} observable types reached.',
  });
