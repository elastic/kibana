/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from './constants';

// Validation messages
export const TITLE_REQUIRED = i18n.translate(
  'xpack.automaticImportV2.forms.integration.titleRequired',
  {
    defaultMessage: 'Integration name is required',
  }
);
export const TITLE_MAX_LENGTH = i18n.translate(
  'xpack.automaticImportV2.forms.integration.titleMaxLength',
  {
    defaultMessage: 'Integration name must be no more than {maxLength} characters',
    values: { maxLength: MAX_NAME_LENGTH },
  }
);
export const DESCRIPTION_REQUIRED = i18n.translate(
  'xpack.automaticImportV2.forms.integration.descriptionRequired',
  {
    defaultMessage: 'Description is required',
  }
);
export const DESCRIPTION_MAX_LENGTH = i18n.translate(
  'xpack.automaticImportV2.forms.integration.descriptionMaxLength',
  {
    defaultMessage: 'Description must be no more than {maxLength} characters',
    values: { maxLength: MAX_DESCRIPTION_LENGTH },
  }
);
export const CONNECTOR_REQUIRED = i18n.translate(
  'xpack.automaticImportV2.forms.integration.connectorRequired',
  {
    defaultMessage: 'Please select a connector',
  }
);
export const PACKAGE_NAMES_FETCH_ERROR = i18n.translate(
  'xpack.automaticImportV2.forms.integration.packageNamesFetchError',
  {
    defaultMessage: 'Failed to fetch installed packages',
  }
);
export const TITLE_ALREADY_EXISTS = i18n.translate(
  'xpack.automaticImportV2.forms.integration.titleAlreadyExists',
  {
    defaultMessage: 'An integration with this name already exists',
  }
);
