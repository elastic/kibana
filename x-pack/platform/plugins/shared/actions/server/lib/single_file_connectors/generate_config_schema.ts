/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OUTBOUND_ENABLED_CONFIG_KEY, type ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';

import type { ActionTypeConfig, ValidatorType } from '../../types';
import { getAllowedHostsKeysFromShape, validateAllowedHostsKeys } from './allowed_hosts_validation';

export interface GenerateConfigSchemaOptions {
  /** Outbound is off: every spec config field is optional. Sent fields keep their validation. */
  allFieldsOptional?: boolean;
}

export const generateConfigSchema = (
  schema: ConnectorSpec['schema'],
  actionNames: readonly string[] = [],
  options: GenerateConfigSchemaOptions = {}
): ValidatorType<ActionTypeConfig> => {
  const authType = z.string().optional();
  // null/absent = recommended (isTool) actions; non-empty array = explicit allowlist.
  const selectedActions = z.array(z.string().max(256)).max(500).nullish();
  // Reserved framework key. Set by the server from `is_outbound_actions_enabled`.
  const outboundEnabled = z.boolean().optional();
  const frameworkKeys = {
    authType,
    selectedActions,
    [OUTBOUND_ENABLED_CONFIG_KEY]: outboundEnabled,
  };
  const strictConfigSchema = schema ? schema.extend(frameworkKeys) : z.object(frameworkKeys);
  // The allowed hosts keys come from the strict shape, because `partial()` wraps each field.
  const allowedHostsKeys = getAllowedHostsKeysFromShape(strictConfigSchema.shape);
  const configSchema = options.allFieldsOptional
    ? strictConfigSchema.partial()
    : strictConfigSchema;
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
    },
  };
};
