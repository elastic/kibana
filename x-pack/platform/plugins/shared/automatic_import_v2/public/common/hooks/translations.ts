/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INDEX_MISSING_EVENT_ORIGINAL = i18n.translate(
  'xpack.automaticImportV2.dataStreams.indexMissingEventOriginal',
  {
    defaultMessage:
      'The selected index does not contain the event.original field. Please select another index to continue.',
  }
);

export const INDEX_VALIDATION_FAILED = i18n.translate(
  'xpack.automaticImportV2.dataStreams.indexValidationFailed',
  {
    defaultMessage: 'Failed to validate index mapping',
  }
);

export const CREATE_INTEGRATION_SUCCESS = i18n.translate(
  'xpack.automaticImportV2.createIntegration.success',
  {
    defaultMessage: 'Integration created successfully',
  }
);

export const CREATE_INTEGRATION_SUCCESS_DESCRIPTION = (integrationId: string) =>
  i18n.translate('xpack.automaticImportV2.createIntegration.successDescription', {
    defaultMessage: 'Integration {integrationId} is now being processed.',
    values: { integrationId },
  });

export const CREATE_INTEGRATION_ERROR = i18n.translate(
  'xpack.automaticImportV2.createIntegration.error',
  {
    defaultMessage: 'Failed to create integration',
  }
);
