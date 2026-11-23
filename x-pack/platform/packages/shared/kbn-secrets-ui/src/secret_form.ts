/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  isValidSecretName,
  normalizeSecretName,
  SECRET_NAME_MAX_LENGTH,
  SECRET_PROVIDER_TYPE,
  SECRET_REFERENCE_MAX_LENGTH,
  SECRET_VALUE_MAX_LENGTH,
  SECRET_VALUE_MIN_LENGTH,
} from '@kbn/secrets';
import type { SecretMetadata, SecretProviderType, WriteSecretParams } from '@kbn/secrets';

export interface SecretFormValues {
  name: string;
  description: string;
  provider: SecretProviderType;
  /** Only for the Kibana provider. It is never known for an existing secret. */
  value: string;
  /** Only for the connector provider. */
  connectorId: string;
  /** Only for the connector provider. */
  reference: string;
}

export type SecretFormField = 'name' | 'value' | 'connectorId' | 'reference';

export type SecretFormErrors = Partial<Record<SecretFormField, string>>;

/** The form of a new secret when there is no secret, or of the replacement of an existing one. */
export const getInitialSecretFormValues = (secret?: SecretMetadata): SecretFormValues => {
  if (!secret) {
    return {
      name: '',
      description: '',
      provider: SECRET_PROVIDER_TYPE.kibana,
      value: '',
      connectorId: '',
      reference: '',
    };
  }
  const { name, description = '', provider } = secret;
  return {
    name,
    description,
    provider,
    value: '',
    connectorId: provider === SECRET_PROVIDER_TYPE.connector ? secret.connectorId : '',
    reference: provider === SECRET_PROVIDER_TYPE.connector ? secret.reference : '',
  };
};

/** The checks that the server makes, so that a mistake shows before the request is sent. */
export const getSecretFormErrors = ({
  values: { name, provider, value, connectorId, reference },
  isReplacing,
  existingNames,
}: {
  values: SecretFormValues;
  isReplacing: boolean;
  existingNames: readonly string[];
}): SecretFormErrors => {
  const errors: SecretFormErrors = {};

  if (!isReplacing) {
    if (name.length === 0) {
      errors.name = i18n.translate('xpack.secretsUi.form.nameRequired', {
        defaultMessage: 'A name is required.',
      });
    } else if (name.length > SECRET_NAME_MAX_LENGTH || !isValidSecretName(name)) {
      errors.name = i18n.translate('xpack.secretsUi.form.nameInvalid', {
        defaultMessage:
          'Use letters, digits and underscores, starting with a letter or an underscore, up to {max} characters.',
        values: { max: SECRET_NAME_MAX_LENGTH },
      });
    } else if (
      existingNames.some((existing) => normalizeSecretName(existing) === normalizeSecretName(name))
    ) {
      errors.name = i18n.translate('xpack.secretsUi.form.nameTaken', {
        defaultMessage: 'A secret with this name already exists. Names are not case sensitive.',
      });
    }
  }

  if (provider === SECRET_PROVIDER_TYPE.kibana) {
    if (value.length < SECRET_VALUE_MIN_LENGTH || value.length > SECRET_VALUE_MAX_LENGTH) {
      errors.value = i18n.translate('xpack.secretsUi.form.valueLength', {
        defaultMessage: 'The value has between {min} and {max} characters.',
        values: { min: SECRET_VALUE_MIN_LENGTH, max: SECRET_VALUE_MAX_LENGTH },
      });
    }
  } else {
    if (connectorId.length === 0) {
      errors.connectorId = i18n.translate('xpack.secretsUi.form.connectorRequired', {
        defaultMessage: 'Select a connector.',
      });
    }
    if (reference.length === 0 || reference.length > SECRET_REFERENCE_MAX_LENGTH) {
      errors.reference = i18n.translate('xpack.secretsUi.form.referenceLength', {
        defaultMessage: 'The reference has between 1 and {max} characters.',
        values: { max: SECRET_REFERENCE_MAX_LENGTH },
      });
    }
  }

  return errors;
};

/**
 * The request that saves the form. When replacing, an empty description is sent as it is,
 * because that is how it gets cleared. When creating, there is nothing to clear.
 */
export const buildWriteSecretParams = ({
  values: { name, description, provider, value, connectorId, reference },
  isReplacing,
}: {
  values: SecretFormValues;
  isReplacing: boolean;
}): WriteSecretParams => ({
  name,
  description: isReplacing || description.length > 0 ? description : undefined,
  source:
    provider === SECRET_PROVIDER_TYPE.kibana
      ? { provider, value }
      : { provider, connectorId, reference },
});
