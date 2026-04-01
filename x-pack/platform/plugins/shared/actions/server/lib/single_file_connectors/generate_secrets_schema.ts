/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';

import {
  generateSecretsSchemaFromSpec,
  getMeta,
  getSchemaForAuthType,
} from '@kbn/connector-specs/src/lib';
import type { ActionTypeSecrets, ValidatorType } from '../../types';
import type { ActionsConfigurationUtilities } from '../../actions_config';

export const generateSecretsSchema = (
  authSpec: ConnectorSpec['auth'],
  configUtils: ActionsConfigurationUtilities
): ValidatorType<ActionTypeSecrets> => {
  const settings = configUtils.getWebhookSettings();
  const isPfxEnabled = settings.ssl.pfx.enabled;
  const schema = generateSecretsSchemaFromSpec(authSpec, { isPfxEnabled });

  const allowedHostsFieldsByAuthType = new Map<string, string[]>();
  for (const authTypeDef of authSpec?.types ?? []) {
    const { schema: authTypeSchema, id: authTypeId } = getSchemaForAuthType(authTypeDef);
    for (const [key, fieldSchema] of Object.entries(authTypeSchema.shape)) {
      const meta = getMeta(fieldSchema);
      if (meta?.validate?.allowedHosts) {
        const keys = allowedHostsFieldsByAuthType.get(authTypeId) ?? [];
        keys.push(key);
        allowedHostsFieldsByAuthType.set(authTypeId, keys);
      }
    }
  }

  return {
    schema,
    customValidator: (secrets, { configurationUtilities }) => {
      const secretsRecord = secrets as Record<string, unknown>;
      const authType = secretsRecord.authType;
      if (typeof authType !== 'string') return;

      const allowedHostsFields = allowedHostsFieldsByAuthType.get(authType);
      if (!allowedHostsFields) return;

      for (const key of allowedHostsFields) {
        const value = secretsRecord[key];
        if (typeof value === 'string') {
          configurationUtilities.ensureUriAllowed(value);
        }
      }
    },
  };
};
