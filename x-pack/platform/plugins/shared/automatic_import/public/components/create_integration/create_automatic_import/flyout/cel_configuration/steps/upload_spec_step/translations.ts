/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OPEN_API_UPLOAD_INSTRUCTIONS = i18n.translate(
  'xpack.automaticImport.celFlyout.step.uploadSpec.uploadInstructions',
  {
    defaultMessage:
      "The LLM will analyze the file to identify the structure of your API data. The OpenAPI spec file is typically found in the vendor's API reference documentation.",
  }
);
export const API_DEFINITION_TITLE = i18n.translate(
  'xpack.automaticImport.celFlyout.step.uploadSpec.apiDefinition.title',
  {
    defaultMessage: 'Upload an OpenAPI spec file',
  }
);
export const API_DEFINITION_DESCRIPTION = i18n.translate(
  'xpack.automaticImport.celFlyout.step.uploadSpec.apiDefinition.description',
  {
    defaultMessage: 'Drag and drop a file or browse files.',
  }
);
export const API_DEFINITION_DESCRIPTION_2 = i18n.translate(
  'xpack.automaticImport.celFlyout.step.uploadSpec.apiDefinition.description2',
  {
    defaultMessage: 'OpenAPI specification',
  }
);
export const API_DEFINITION_ERROR = {
  CAN_NOT_READ: i18n.translate(
    'xpack.automaticImport.celFlyout.step.uploadSpec.openapiSpec.errorCanNotRead',
    {
      defaultMessage: 'Failed to read the uploaded file',
    }
  ),
  INVALID_OAS: i18n.translate(
    'xpack.automaticImport.celFlyout.step.uploadSpec.openapiSpec.errorInvalidFormat',
    {
      defaultMessage: 'Uploaded file is not a valid OpenApi spec file',
    }
  ),
  CAN_NOT_READ_WITH_REASON: (reason: string) =>
    i18n.translate(
      'xpack.automaticImport.celFlyout.step.uploadSpec.openapiSpec.errorCanNotReadWithReason',
      {
        values: { reason },
        defaultMessage: 'An error occurred when reading spec file: {reason}',
      }
    ),
  TOO_LARGE_TO_PARSE: i18n.translate(
    'xpack.automaticImport.celFlyout.step.uploadSpec.openapiSpec.errorTooLargeToParse',
    {
      defaultMessage: 'This spec file is too large to parse',
    }
  ),
  NO_PATHS_IDENTIFIED: i18n.translate(
    'xpack.automaticImport.celFlyout.step.uploadSpec.openapiSpec.noPathsIdentified',
    {
      defaultMessage: 'No valid paths found in OpenAPI spec file',
    }
  ),
};
export const GENERATION_ERROR = i18n.translate(
  'xpack.automaticImport.celFlyout.step.uploadSpec.generationError',
  {
    defaultMessage: 'An error occurred during API analysis',
  }
);
export const ANALYZE = i18n.translate('xpack.automaticImport.celFlyout.step.uploadSpec.analyze', {
  defaultMessage: 'Analyze',
});
export const ANALYZING = i18n.translate(
  'xpack.automaticImport.celFlyout.step.uploadSpec.analyzing',
  {
    defaultMessage: 'Analyzing',
  }
);
export const CANCEL = i18n.translate('xpack.automaticImport.celFlyout.step.uploadSpec.cancel', {
  defaultMessage: 'Cancel',
});
export const SUCCESS = i18n.translate('xpack.automaticImport.celFlyout.step.uploadSpec.success', {
  defaultMessage: 'Success',
});
export const DATASTREAM_TITLE_REQUIRED = i18n.translate(
  'xpack.automaticImport.celFlyout.step.uploadSpec.dataStreamRequired',
  {
    defaultMessage: 'A data stream title is required',
  }
);
export const SPEC_FILE_REQUIRED = i18n.translate(
  'xpack.automaticImport.celFlyout.step.uploadSpec.specFileRequired',
  {
    defaultMessage: 'An OpenAPI spec file is required',
  }
);
