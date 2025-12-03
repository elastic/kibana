/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NormalizedAuthType } from '@kbn/connector-specs';
import { authTypeSpecs } from '@kbn/connector-specs';
import type { Logger } from '@kbn/core/server';
import type { AuthTypeRegistry } from './auth_type_registry';
import type { ActionsConfigurationUtilities } from '../actions_config';

interface RegisterAuthTypesOpts {
  configUtils: ActionsConfigurationUtilities;
  logger: Logger;
  registry: AuthTypeRegistry;
}
export function registerAuthTypes({ configUtils, logger, registry }: RegisterAuthTypesOpts) {
  const webhookSettings = configUtils.getWebhookSettings();
  for (const spec of Object.values(authTypeSpecs)) {
    if (spec.id === 'pfx_certificate' && !webhookSettings.ssl.pfx.enabled) {
      logger.info(
        `Skipping registration of PFX certificate auth type as it is disabled in the config.`
      );
      continue;
    }

    registry.register(spec as NormalizedAuthType);
  }
}
