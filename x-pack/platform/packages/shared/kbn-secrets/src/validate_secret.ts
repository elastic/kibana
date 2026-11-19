/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECRET_DESCRIPTION_MAX_LENGTH,
  SECRET_PROVIDER_TYPE,
  SECRET_REFERENCE_MAX_LENGTH,
  SECRET_VALUE_MAX_LENGTH,
  SECRET_VALUE_MIN_LENGTH,
} from './constants';
import { SecretValidationError } from './errors';
import { isValidSecretName } from './secret_name';
import type { SecretSource, WriteSecretParams } from './types';

const validateSource = (source: SecretSource, connectorSecretsAvailable: boolean): void => {
  if (source.provider === SECRET_PROVIDER_TYPE.kibana) {
    const { length } = source.value;
    if (length < SECRET_VALUE_MIN_LENGTH || length > SECRET_VALUE_MAX_LENGTH) {
      throw new SecretValidationError(
        `A secret value has between ${SECRET_VALUE_MIN_LENGTH} and ${SECRET_VALUE_MAX_LENGTH} characters`
      );
    }
    return;
  }
  if (!connectorSecretsAvailable) {
    throw new SecretValidationError('Secrets from a connector are not available');
  }
  if (source.connectorId.length === 0) {
    throw new SecretValidationError('A secret from a connector needs a connector');
  }
  if (source.reference.length === 0 || source.reference.length > SECRET_REFERENCE_MAX_LENGTH) {
    throw new SecretValidationError(
      `A secret reference has between 1 and ${SECRET_REFERENCE_MAX_LENGTH} characters`
    );
  }
};

/** Throws `SecretValidationError` when a secret cannot be created or replaced as requested. */
export const validateSecret = ({
  secret: { name, description, source },
  connectorSecretsAvailable,
}: {
  secret: WriteSecretParams;
  connectorSecretsAvailable: boolean;
}): void => {
  if (!isValidSecretName(name)) {
    throw new SecretValidationError(
      'A secret name starts with a letter or an underscore and contains only letters, digits and underscores'
    );
  }
  if (description !== undefined && description.length > SECRET_DESCRIPTION_MAX_LENGTH) {
    throw new SecretValidationError(
      `A secret description has at most ${SECRET_DESCRIPTION_MAX_LENGTH} characters`
    );
  }
  validateSource(source, connectorSecretsAvailable);
};
