/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Copies authType from secrets into config when absent. Config is stored in plaintext
// while secrets are encrypted, so authType must be in config to remain readable after save.
export const ensureConfigAuthType = (
  config: Record<string, unknown>,
  secrets: Record<string, unknown>
): Record<string, unknown> => {
  const secretAuthType = (secrets as { authType?: string }).authType;
  if (!secretAuthType || config.authType !== undefined) {
    return config;
  }
  return { ...config, authType: secretAuthType };
};
