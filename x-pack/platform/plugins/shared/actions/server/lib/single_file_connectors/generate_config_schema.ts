/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';

import type { ActionTypeConfig, ValidatorServices, ValidatorType } from '../../types';
import { validateValueAgainstAllowedHostsJsonSchema } from './validate_allowed_hosts';

export const generateConfigSchema = (
  schema: ConnectorSpec['schema']
): ValidatorType<ActionTypeConfig> => {
  const authType = z.string().optional();
  const configSchema = schema ? schema.extend({ authType }) : z.object({ authType });
  const allowedHostsJsonSchema = z.toJSONSchema(configSchema as never);
  return {
    schema: configSchema,
    customValidator: (config, services) =>
      validateAllowedHostsUrls(config, services, allowedHostsJsonSchema),
  };
};

function validateAllowedHostsUrls(
  config: ActionTypeConfig,
  { configurationUtilities }: ValidatorServices,
  jsonSchema: unknown
): void {
  validateValueAgainstAllowedHostsJsonSchema(
    config as Record<string, unknown>,
    jsonSchema,
    configurationUtilities
  );
}
