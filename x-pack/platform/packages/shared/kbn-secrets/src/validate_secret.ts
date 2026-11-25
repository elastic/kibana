/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECRET_DESCRIPTION_MAX_LENGTH,
  SECRET_NAME_MAX_LENGTH,
  SECRET_VALUE_MAX_LENGTH,
  SECRET_VALUE_MIN_LENGTH,
} from './constants';
import { SecretValidationError } from './errors';
import { isValidSecretName } from './secret_name';
import type { SecretSource, UpdateSecretParams } from './types';

const validateSourceValue = ({ value: { length } }: SecretSource): void => {
  if (length < SECRET_VALUE_MIN_LENGTH || length > SECRET_VALUE_MAX_LENGTH) {
    throw new SecretValidationError(
      `A secret value has between ${SECRET_VALUE_MIN_LENGTH} and ${SECRET_VALUE_MAX_LENGTH} characters`
    );
  }
};

/**
 * Throws `SecretValidationError` when a secret cannot be created or updated as requested.
 * An update that keeps the current source has no source to check.
 */
export const validateSecret = ({ name, description, source }: UpdateSecretParams): void => {
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
  if (source) {
    validateSourceValue(source);
  }
};
