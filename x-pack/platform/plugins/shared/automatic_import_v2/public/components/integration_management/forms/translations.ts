/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

// Validation messages
export const TITLE_REQUIRED = i18n.translate(
  'xpack.automaticImportV2.forms.integration.titleRequired',
  {
    defaultMessage: 'Integration name is required',
  }
);
export const DESCRIPTION_REQUIRED = i18n.translate(
  'xpack.automaticImportV2.forms.integration.descriptionRequired',
  {
    defaultMessage: 'Description is required',
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

// Data stream validation messages
export const DATA_STREAM_TITLE_REQUIRED = i18n.translate(
  'xpack.automaticImportV2.forms.dataStream.titleRequired',
  {
    defaultMessage: 'Data stream title is required',
  }
);
export const DATA_STREAM_DESCRIPTION_REQUIRED = i18n.translate(
  'xpack.automaticImportV2.forms.dataStream.descriptionRequired',
  {
    defaultMessage: 'Data stream description is required',
  }
);
export const DATA_COLLECTION_METHOD_REQUIRED = i18n.translate(
  'xpack.automaticImportV2.forms.dataStream.dataCollectionMethodRequired',
  {
    defaultMessage: 'Please select a data collection method',
  }
);
export const LOG_SAMPLE_REQUIRED = i18n.translate(
  'xpack.automaticImportV2.forms.dataStream.logSampleRequired',
  {
    defaultMessage: 'A log sample is required for analysis',
  }
);
export const SELECTED_INDEX_REQUIRED = i18n.translate(
  'xpack.automaticImportV2.forms.dataStream.selectedIndexRequired',
  {
    defaultMessage: 'Please select an index',
  }
);
