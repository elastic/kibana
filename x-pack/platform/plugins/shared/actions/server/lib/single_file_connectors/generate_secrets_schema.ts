/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';

import { generateSecretsSchemaFromSpec } from '@kbn/connector-specs/src/lib';
import type { ActionTypeSecrets, ValidatorServices, ValidatorType } from '../../types';
import type { ActionsConfigurationUtilities } from '../../actions_config';

export const generateSecretsSchema = (
  authSpec: ConnectorSpec['auth'],
  configUtils: ActionsConfigurationUtilities
): ValidatorType<ActionTypeSecrets> => {
  const settings = configUtils.getWebhookSettings();
  const isPfxEnabled = settings.ssl.pfx.enabled;
  const defaultsByAuthType = getDefaultsByAuthType(authSpec);
  return {
    schema: generateSecretsSchemaFromSpec(authSpec, {
      isPfxEnabled,
    }),
    customValidator: (secrets, services) =>
      validateOAuthUrls(secrets, services, defaultsByAuthType),
  };
};

/**
 * Validates OAuth URL fields in connector secrets against xpack.actions.allowedHosts.
 * Applies to any auth type that stores authorizationUrl or tokenUrl in secrets
 * (e.g. oauth_authorization_code).
 */
function validateOAuthUrls(
  secrets: ActionTypeSecrets,
  { configurationUtilities }: ValidatorServices,
  defaultsByAuthType: ReadonlyMap<string, Readonly<Record<string, unknown>>>
): void {
  const authType = getAuthTypeIdFromSecrets(secrets);
  const defaults = authType ? defaultsByAuthType.get(authType) : undefined;

  const authorizationUrl =
    typeof secrets.authorizationUrl === 'string'
      ? secrets.authorizationUrl
      : typeof defaults?.authorizationUrl === 'string'
      ? defaults.authorizationUrl
      : undefined;

  const tokenUrl =
    typeof secrets.tokenUrl === 'string'
      ? secrets.tokenUrl
      : typeof defaults?.tokenUrl === 'string'
      ? defaults.tokenUrl
      : undefined;

  if (authorizationUrl) {
    configurationUtilities.ensureUriAllowed(authorizationUrl);
  }
  if (tokenUrl) {
    configurationUtilities.ensureUriAllowed(tokenUrl);
  }
}

function getAuthTypeIdFromSecrets(secrets: ActionTypeSecrets): string | undefined {
  const authType = (secrets as { authType?: unknown }).authType;
  return typeof authType === 'string' && authType.length > 0 ? authType : undefined;
}

function getDefaultsByAuthType(
  authSpec: ConnectorSpec['auth']
): ReadonlyMap<string, Readonly<Record<string, unknown>>> {
  const defaults = new Map<string, Readonly<Record<string, unknown>>>();
  for (const authType of authSpec?.types ?? []) {
    if (typeof authType === 'object' && authType !== null) {
      const typeId = (authType as { type?: unknown }).type;
      const typeDefaults = (authType as { defaults?: unknown }).defaults;
      if (typeof typeId === 'string' && typeDefaults && typeof typeDefaults === 'object') {
        defaults.set(typeId, typeDefaults as Readonly<Record<string, unknown>>);
      }
    }
  }
  return defaults;
}
