/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';

import { generateSecretsSchemaFromSpec, getSchemaForAuthType } from '@kbn/connector-specs/src/lib';
import type { ActionTypeSecrets, ValidatorType, ValidatorServices } from '../../types';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import { getAllowedHostsKeysFromShape, validateAllowedHostsKeys } from './allowed_hosts_validation';

const buildAllowedHostsFieldsByAuthType = (authSpec: ConnectorSpec['auth']) => {
  const allowedHostsFieldsByAuthType = new Map<string, string[]>();

  for (const authTypeDef of authSpec?.types ?? []) {
    const { schema: authTypeSchema, id: authTypeId } = getSchemaForAuthType(authTypeDef);
    const keys = getAllowedHostsKeysFromShape(authTypeSchema.shape);
    if (keys.length) {
      allowedHostsFieldsByAuthType.set(authTypeId, keys);
    }
  }

  return allowedHostsFieldsByAuthType;
};

export const generateSecretsSchema = (
  authSpec: ConnectorSpec['auth'],
  configUtils: ActionsConfigurationUtilities
): ValidatorType<ActionTypeSecrets> => {
  const settings = configUtils.getWebhookSettings();
  const isPfxEnabled = settings.ssl.pfx.enabled;
  // Always include EARS in the static schema regardless of the feature flag.
  // This lets the customValidator (below) return a readable error message when EARS is
  // disabled, instead of a cryptic Zod union discriminator error.
  const schema = generateSecretsSchemaFromSpec(authSpec, { isPfxEnabled, isEarsEnabled: true });

  const allowedHostsFieldsByAuthType = buildAllowedHostsFieldsByAuthType(authSpec);

  return {
    schema,
    customValidator: (
      secrets: ActionTypeSecrets,
      { configurationUtilities }: ValidatorServices
    ): void => {
      const secretsRecord = secrets as Record<string, unknown>;
      const authType = secretsRecord.authType;
      if (typeof authType !== 'string') return;

      if (authType === 'ears' && !configurationUtilities.isEarsEnabled()) {
        throw new Error(
          'EARS OAuth authentication is not enabled. Enable it via xpack.actions.ears.enabled in kibana.yml.'
        );
      }

      const allowedHostsFields = allowedHostsFieldsByAuthType.get(authType);
      if (!allowedHostsFields) return;

      validateAllowedHostsKeys(secretsRecord, allowedHostsFields, configurationUtilities);
    },
  };
};
