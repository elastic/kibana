/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';

export const createEventIdentityEncryptionUnavailableError = (): Boom.Boom =>
  Boom.badRequest(
    i18n.translate('xpack.actions.serverSideErrors.connectorEventIdentityEncryptionUnavailable', {
      defaultMessage:
        'Unable to store connector event identity because encrypted saved objects are not available. Set xpack.encryptedSavedObjects.encryptionKey in kibana.yml.',
    })
  );

export const createEventIdentityApiKeysDisabledError = (): Boom.Boom =>
  Boom.badRequest(
    i18n.translate('xpack.actions.serverSideErrors.connectorEventIdentityApiKeysDisabled', {
      defaultMessage: 'Unable to store connector event identity because API keys are disabled.',
    })
  );

export const createEventIdentityUiamUnsupportedError = (): Boom.Boom =>
  Boom.badRequest(
    i18n.translate('xpack.actions.serverSideErrors.connectorEventIdentityUiamUnsupported', {
      defaultMessage:
        'Cannot use a Cloud API key to save this inbound connector. Cloud API keys are only supported in serverless environments; use a project-scoped Elasticsearch API key instead.',
    })
  );
