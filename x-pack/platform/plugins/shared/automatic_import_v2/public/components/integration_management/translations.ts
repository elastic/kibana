/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const PAGE_TITLE_NEW_INTEGRATION = i18n.translate(
  'xpack.automaticImportV2.integrationManagement.pageTitleNewIntegration',
  {
    defaultMessage: 'New Integration',
  }
);

export const INTEGRATION_NOT_FOUND_TITLE = i18n.translate(
  'xpack.automaticImportV2.integrationManagement.integrationNotFoundTitle',
  {
    defaultMessage: 'Integration not found',
  }
);

export const INTEGRATION_NOT_FOUND_DESCRIPTION = i18n.translate(
  'xpack.automaticImportV2.integrationManagement.integrationNotFoundDescription',
  {
    defaultMessage: 'The integration you are looking for does not exist or could not be loaded.',
  }
);

export const GO_BACK_BUTTON = i18n.translate(
  'xpack.automaticImportV2.integrationManagement.goBackButton',
  {
    defaultMessage: 'Go back',
  }
);

export const DELETE_INTEGRATION_MODAL_TITLE = i18n.translate(
  'xpack.automaticImportV2.integrationManagement.deleteIntegrationModal.title',
  {
    defaultMessage: 'Delete this integration?',
  }
);

export const DELETE_INTEGRATION_MODAL_BODY = i18n.translate(
  'xpack.automaticImportV2.integrationManagement.deleteIntegrationModal.body',
  {
    defaultMessage:
      'An integration must have at least one data stream. Do you want to delete this integration instead?',
  }
);

export const DELETE_INTEGRATION_MODAL_CONFIRM = i18n.translate(
  'xpack.automaticImportV2.integrationManagement.deleteIntegrationModal.confirm',
  {
    defaultMessage: 'Delete integration',
  }
);

export const DELETE_INTEGRATION_MODAL_CANCEL = i18n.translate(
  'xpack.automaticImportV2.integrationManagement.deleteIntegrationModal.cancel',
  {
    defaultMessage: 'Cancel',
  }
);
