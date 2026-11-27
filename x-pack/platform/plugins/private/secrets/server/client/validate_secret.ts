/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isValidSecretName,
  SECRET_DESCRIPTION_MAX_LENGTH,
  SECRET_NAME_MAX_LENGTH,
  SECRET_VALUE_MAX_LENGTH,
  SECRET_VALUE_MIN_LENGTH,
  SecretValidationError,
} from '@kbn/secrets';
import type { CreateSecretParams, UpdateSecretParams } from '@kbn/secrets';

/** Throws `SecretValidationError` when a secret breaks a rule; an omitted value is not checked. */
export const validateSecret = ({
  name,
  description,
  value,
}: CreateSecretParams | UpdateSecretParams): void => {
  if (!isValidSecretName(name)) {
    throw new SecretValidationError(
      `A secret name has at most ${SECRET_NAME_MAX_LENGTH} characters, starts with a lowercase letter or an underscore and contains only lowercase letters, digits and underscores`
    );
  }
  if (description !== undefined && description.length > SECRET_DESCRIPTION_MAX_LENGTH) {
    throw new SecretValidationError(
      `A secret description has at most ${SECRET_DESCRIPTION_MAX_LENGTH} characters`
    );
  }
  if (
    value !== undefined &&
    (value.length < SECRET_VALUE_MIN_LENGTH || value.length > SECRET_VALUE_MAX_LENGTH)
  ) {
    throw new SecretValidationError(
      `A secret value has between ${SECRET_VALUE_MIN_LENGTH} and ${SECRET_VALUE_MAX_LENGTH} characters`
    );
  }
};
