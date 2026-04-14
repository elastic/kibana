/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import goldenClusterPrivileges from './golden_cluster_privileges.json';

/**
 * Builds the Dev Tools console payload for creating a golden cluster API key.
 *
 * Privileges are read from golden_cluster_privileges.json so the CLI, README,
 * and upload scripts all share a single source of truth.
 */
export const buildApiKeyPayload = (userIdentifier: string): string => {
  const body = {
    name: `kbn-evals-${userIdentifier}`,
    expiration: '90d',
    ...goldenClusterPrivileges,
  };

  return `POST kbn:/internal/security/api_key\n${JSON.stringify(body, null, 2)}`;
};
