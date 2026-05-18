/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z, ZodType } from '@kbn/zod/v4';
import { getMeta } from '@kbn/connector-specs/src/lib';

import type { ActionsConfigurationUtilities } from '../../actions_config';

export const getAllowedHostsKeysFromShape = (shape: z.ZodRawShape): string[] => {
  const keys: string[] = [];
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const meta = getMeta(fieldSchema as ZodType);
    if (meta?.validate?.allowedHosts === true) {
      keys.push(key);
    }
  }
  return keys;
};

export const validateAllowedHostsKeys = (
  record: Record<string, unknown>,
  keys: readonly string[],
  configurationUtilities: ActionsConfigurationUtilities
): void => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') {
      configurationUtilities.ensureUriAllowed(value);
    }
  }
};
