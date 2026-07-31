/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';

import type { ActionTypeConfig, ValidatorType } from '../../types';
import { getAllowedHostsKeysFromShape, validateAllowedHostsKeys } from './allowed_hosts_validation';

export const generateConfigSchema = (
  schema: ConnectorSpec['schema']
): ValidatorType<ActionTypeConfig> => {
  const authType = z.string().optional();
  // null = "all actions" sentinel; executor treats non-array as all-allowed.
  const selectedActions = z.array(z.string()).nullish();
  const configSchema = schema
    ? schema.extend({ authType, selectedActions })
    : z.object({ authType, selectedActions });
  const allowedHostsKeys = getAllowedHostsKeysFromShape(configSchema.shape);

  return {
    schema: configSchema,
    customValidator: (config, { configurationUtilities }) => {
      validateAllowedHostsKeys(
        config as Record<string, unknown>,
        allowedHostsKeys,
        configurationUtilities
      );
    },
  };
};
