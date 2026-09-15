/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { goldenClusterPrivileges } from '@kbn/evals-common';

/**
 * Builds the Dev Tools console payload for creating a golden cluster API key.
 *
 * Privileges are sourced from @kbn/evals-common so the CLI, plugin UI,
 * and upload scripts all share a single source of truth.
 */
export const buildApiKeyPayload = (userIdentifier: string): string => {
  const body = {
    name: `kbn-evals-${userIdentifier}`,
    expiration: '90d',
    ...goldenClusterPrivileges,
    metadata: { application: 'kbn-evals', purpose: 'local development' },
  };

  return `POST kbn:/internal/security/api_key\n${JSON.stringify(body, null, 2)}`;
};
