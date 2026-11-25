/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OUTBOUND_ENABLED_CONFIG_KEY } from '@kbn/connector-specs';

/** Reserved `config.outboundEnabled`. The response shows it as `is_outbound_actions_enabled`, so hide the key. */
export const omitOutboundEnabledFromConfig = (
  config?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  if (config === undefined) {
    return undefined;
  }
  const { [OUTBOUND_ENABLED_CONFIG_KEY]: _omit, ...rest } = config;
  return rest;
};
