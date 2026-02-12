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
      'The selected index does not contain the `event.original` field. Please select another index to continue.',
  }
);

export const INDEX_VALIDATION_FAILED = i18n.translate(
  'xpack.automaticImportV2.dataStreams.indexValidationFailed',
  {
    defaultMessage: 'Failed to validate index mapping',
  }
);

export const SAVE_INTEGRATION_SUCCESS = i18n.translate(
  'xpack.automaticImportV2.saveIntegration.success',
  {
    defaultMessage: 'Integration saved successfully',
  }
);

export const SAVE_INTEGRATION_SUCCESS_DESCRIPTION = (integrationId: string) =>
  i18n.translate('xpack.automaticImportV2.saveIntegration.successDescription', {
    defaultMessage: 'Integration {integrationId} is now being processed.',
    values: { integrationId },
  });

export const SAVE_INTEGRATION_ERROR = i18n.translate(
  'xpack.automaticImportV2.saveIntegration.error',
  {
    defaultMessage: 'Failed to save integration',
  }
);

export const LOAD_CONNECTORS_ERROR_TITLE = i18n.translate(
  'xpack.automaticImportV2.hooks.loadConnectors.errorTitle',
  {
    defaultMessage: 'Unable to load connectors',
  }
);
export const LOAD_CONNECTORS_ERROR_MESSAGE = i18n.translate(
  'xpack.automaticImportV2.hooks.loadConnectors.errorMessage',
  {
    defaultMessage: 'Failed to load connectors',
  }
);

export const UPLOAD_SAMPLES_SUCCESS = i18n.translate(
  'xpack.automaticImportV2.hooks.uploadSamples.success',
  {
    defaultMessage: 'Samples uploaded successfully',
  }
);

export const UPLOAD_SAMPLES_ERROR = i18n.translate(
  'xpack.automaticImportV2.hooks.uploadSamples.error',
  {
    defaultMessage: 'Failed to upload samples',
  }
);

export const DELETE_DATA_STREAM_SUCCESS = i18n.translate(
  'xpack.automaticImportV2.hooks.deleteDataStream.success',
  {
    defaultMessage: 'Data stream deleted successfully',
  }
);

export const DELETE_DATA_STREAM_ERROR = i18n.translate(
  'xpack.automaticImportV2.hooks.deleteDataStream.error',
  {
    defaultMessage: 'Failed to delete data stream',
  }
);

export const REANALYZE_DATA_STREAM_SUCCESS = i18n.translate(
  'xpack.automaticImportV2.hooks.reanalyzeDataStream.success',
  {
    defaultMessage: 'Data stream analysis restarted',
  }
);

export const REANALYZE_DATA_STREAM_ERROR = i18n.translate(
  'xpack.automaticImportV2.hooks.reanalyzeDataStream.error',
  {
    defaultMessage: 'Failed to restart data stream analysis',
  }
);
