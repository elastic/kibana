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
import type {
  UpdateSecretParams,
  SecretMetadata,
  SecretProviderType,
  SecretSource,
  WriteSecretParams,
} from '@kbn/secrets';

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

/** The form of a new secret when there is no secret, or to edit an existing one. */
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

/**
 * Whether the form leaves the source of the secret it edits as it is. A value stored in
 * Kibana is never known to the form, so leaving it empty is how it is kept.
 */
const isKeepingSource = ({
  values: { provider, value, connectorId, reference },
  secret,
}: {
  values: SecretFormValues;
  secret?: SecretMetadata;
}): boolean => {
  if (!secret || secret.provider !== provider) {
    return false;
  }
  return secret.provider === SECRET_PROVIDER_TYPE.kibana
    ? value.length === 0
    : secret.connectorId === connectorId && secret.reference === reference;
};

/** Whether saving the form would change the secret it edits. A new secret is always a change. */
export const hasSecretFormChanges = ({
  values,
  secret,
}: {
  values: SecretFormValues;
  secret?: SecretMetadata;
}): boolean =>
  !secret ||
  values.description !== (secret.description ?? '') ||
  !isKeepingSource({ values, secret });

/** The checks that the server makes, so that a mistake shows before the request is sent. */
export const getSecretFormErrors = ({
  values,
  secret,
  existingNames,
}: {
  values: SecretFormValues;
  /** The secret that the form edits. Without it, the form creates a secret. */
  secret?: SecretMetadata;
  existingNames: readonly string[];
}): SecretFormErrors => {
  const { name, provider, value, connectorId, reference } = values;
  const errors: SecretFormErrors = {};

  if (!secret) {
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

  if (isKeepingSource({ values, secret })) {
    return errors;
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

const getSource = ({
  provider,
  value,
  connectorId,
  reference,
}: Pick<SecretFormValues, 'provider' | 'value' | 'connectorId' | 'reference'>): SecretSource =>
  provider === SECRET_PROVIDER_TYPE.kibana
    ? { provider, value }
    : { provider, connectorId, reference };

/** The request that creates the secret of the form. */
export const buildCreateSecretParams = ({
  name,
  description,
  provider,
  value,
  connectorId,
  reference,
}: SecretFormValues): WriteSecretParams => ({
  name,
  description: description.length > 0 ? description : undefined,
  source: getSource({ provider, value, connectorId, reference }),
});

/**
 * The request that updates a secret with the form. An empty description is sent as it is,
 * because that is how it gets cleared. A source that did not change is not sent, so that it
 * is kept.
 */
export const buildUpdateSecretParams = ({
  values,
  secret,
}: {
  values: SecretFormValues;
  secret: SecretMetadata;
}): UpdateSecretParams => ({
  name: secret.name,
  description: values.description,
  source: isKeepingSource({ values, secret }) ? undefined : getSource(values),
});
