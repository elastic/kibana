/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';

import { generateSecretsSchemaFromSpec } from '@kbn/connector-specs/src/lib';
import { z } from '@kbn/zod/v4';
import type { ActionTypeSecrets, ValidatorServices, ValidatorType } from '../../types';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import {
  getDiscriminatedUnionVariantJsonSchemaNode,
  validateValueAgainstAllowedHostsJsonSchema,
} from './validate_allowed_hosts';

export const generateSecretsSchema = (
  authSpec: ConnectorSpec['auth'],
  configUtils: ActionsConfigurationUtilities
): ValidatorType<ActionTypeSecrets> => {
  const settings = configUtils.getWebhookSettings();
  const isPfxEnabled = settings.ssl.pfx.enabled;
  const schema = generateSecretsSchemaFromSpec(authSpec, { isPfxEnabled });
  const allowedHostsJsonSchema = z.toJSONSchema(schema as never);
  return {
    schema,
    customValidator: (secrets, services) =>
      validateAllowedHostsUrls(secrets, services, allowedHostsJsonSchema),
  };
};

/**
 * Validates all URL fields in secrets (as defined by the auth type schema) against
 * `xpack.actions.allowedHosts`, unless the field opts out via
 * `meta({ validate: { allowedHosts: false } })`.
 */
function validateAllowedHostsUrls(
  secrets: ActionTypeSecrets,
  { configurationUtilities }: ValidatorServices,
  jsonSchema: unknown
): void {
  const authType = getAuthTypeIdFromSecrets(secrets);
  const authTypeSchemaNode = authType
    ? getDiscriminatedUnionVariantJsonSchemaNode(jsonSchema, 'authType', authType) ?? jsonSchema
    : jsonSchema;

  validateValueAgainstAllowedHostsJsonSchema(
    secrets as Record<string, unknown>,
    authTypeSchemaNode,
    configurationUtilities
  );
}

function getAuthTypeIdFromSecrets(secrets: ActionTypeSecrets): string | undefined {
  const authType = (secrets as { authType?: unknown }).authType;
  return typeof authType === 'string' && authType.length > 0 ? authType : undefined;
}
