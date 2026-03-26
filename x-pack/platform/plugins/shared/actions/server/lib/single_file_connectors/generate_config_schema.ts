/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { getMeta } from '@kbn/connector-specs/src/lib';
import { z } from '@kbn/zod/v4';

import type { ActionTypeConfig, ValidatorType } from '../../types';

export const generateConfigSchema = (
  schema: ConnectorSpec['schema']
): ValidatorType<ActionTypeConfig> => {
  const authType = z.string().optional();
  const configSchema = schema ? schema.extend({ authType }) : z.object({ authType });

  return {
    schema: configSchema,
    customValidator: (config, { configurationUtilities }) => {
      for (const [key, fieldSchema] of Object.entries(configSchema.shape)) {
        const meta = getMeta(fieldSchema);
        if (meta?.validate?.allowedHosts) {
          configurationUtilities.ensureUriAllowed(
            (config as Record<string, unknown>)[key] as string
          );
        }
      }
    },
  };
};
