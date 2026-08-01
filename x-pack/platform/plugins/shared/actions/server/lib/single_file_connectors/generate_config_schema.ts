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
  schema: ConnectorSpec['schema'],
  actionNames: readonly string[] = []
): ValidatorType<ActionTypeConfig> => {
  const authType = z.string().optional();
  // null/absent = recommended (isTool) actions; non-empty array = explicit allowlist.
  const selectedActions = z.array(z.string()).nullish();
  const configSchema = schema
    ? schema.extend({ authType, selectedActions })
    : z.object({ authType, selectedActions });
  const allowedHostsKeys = getAllowedHostsKeysFromShape(configSchema.shape);
  const knownActionNames = new Set(actionNames);

  return {
    schema: configSchema,
    customValidator: (config, { configurationUtilities }) => {
      validateAllowedHostsKeys(
        config as Record<string, unknown>,
        allowedHostsKeys,
        configurationUtilities
      );

      const selected = (config as { selectedActions?: string[] | null }).selectedActions;
      if (!Array.isArray(selected)) {
        return;
      }
      if (selected.length === 0) {
        throw new Error('selectedActions must include at least one action when set.');
      }
      if (knownActionNames.size === 0) {
        return;
      }
      const unknown = selected.filter((name) => !knownActionNames.has(name));
      if (unknown.length > 0) {
        throw new Error(
          `selectedActions contains unknown action names: ${unknown.sort().join(', ')}.`
        );
      }
    },
  };
};
