/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RECOMMENDED = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.recommended',
  {
    defaultMessage: 'Recommended',
  }
);
export const ENTER_MANUALLY = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.enterManually',
  {
    defaultMessage: 'Enter manually',
  }
);
export const CONFIRM_ENDPOINT = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.confirmEndpoint',
  {
    defaultMessage: 'Choose API endpoint',
  }
);
export const CONFIRM_ENDPOINT_DESCRIPTION = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.confirmEndpointDescription',
  {
    defaultMessage: 'Recommended API endpoints (chosen from your spec file):',
  }
);
export const CONFIRM_AUTH = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.confirmAuth',
  {
    defaultMessage: 'Select Authentication method',
  }
);
export const CONFIRM_AUTH_DESCRIPTION = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.confirmAuthDescription',
  {
    defaultMessage:
      'Select the authentication method for the API endpoint. Generation should take less than a minute.',
  }
);
export const AUTH_SELECTION_TITLE = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.authSelectionTitle',
  {
    defaultMessage: 'Preferred method',
  }
);
export const AUTH_DOES_NOT_ALIGN = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.authDoesNotAlign',
  {
    defaultMessage: 'This method does not align with your spec file',
  }
);
export const GENERATION_ERROR = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.generationError',
  {
    defaultMessage: 'An error occurred during: CEL input generation',
  }
);
export const GENERATE = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.generateButtonLabel',
  {
    defaultMessage: 'Generate',
  }
);
export const GENERATING = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.generatingButtonLabel',
  {
    defaultMessage: 'Generating',
  }
);
export const SUCCESS = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.success',
  {
    defaultMessage: 'Success! Configuration ready.',
  }
);
export const CANCEL = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.cancel',
  {
    defaultMessage: 'Cancel',
  }
);
export const PATH_REQUIRED = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.pathRequired',
  {
    defaultMessage: 'API endpoint is required',
  }
);
export const AUTH_REQUIRED = i18n.translate(
  'xpack.automaticImport.celFlyout.step.confirmSettings.authRequired',
  {
    defaultMessage: 'Authentication method is required',
  }
);
