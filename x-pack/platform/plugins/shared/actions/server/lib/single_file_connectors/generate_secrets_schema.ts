/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';

import { generateSecretsSchemaFromSpec } from '@kbn/connector-specs/src/lib';
import type { ActionTypeSecrets, ValidatorType } from '../../types';
import type { ActionsConfigurationUtilities } from '../../actions_config';

export const generateSecretsSchema = (
  authSpec: ConnectorSpec['auth'],
  configUtils: ActionsConfigurationUtilities
): ValidatorType<ActionTypeSecrets> => {
  const settings = configUtils.getWebhookSettings();
  const isPfxEnabled = settings.ssl.pfx.enabled;
  return {
    schema: generateSecretsSchemaFromSpec(authSpec, { isPfxEnabled }),
  };
};
