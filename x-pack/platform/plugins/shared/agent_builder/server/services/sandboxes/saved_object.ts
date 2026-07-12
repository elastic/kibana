/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import type {
  SandboxConnection,
  SandboxPolicy,
  SandboxProviderId,
  SandboxRuntimeConfig,
  SandboxRuntimeId,
} from '@kbn/agent-builder-common';

export const SANDBOX_PROFILE_SO_TYPE = 'agent_builder_sandbox_profile';

/**
 * Attributes of a persisted Sandbox Profile.
 *
 * `secrets` holds secret connection material (a remote kubeconfig, a GCP service
 * account key, ...) and is encrypted at rest. Local Kubernetes needs no secret,
 * so `secrets` is empty for it — but the field is encrypted from day one so a
 * secret-bearing provider (remote k8s / Cloud Run) drops in without an
 * unencrypted->encrypted migration (which ESO does not support).
 */
export interface SandboxProfileAttributes {
  name: string;
  description?: string;
  provider: SandboxProviderId;
  runtime: SandboxRuntimeId;
  connection: SandboxConnection;
  runtime_config: SandboxRuntimeConfig;
  policy: SandboxPolicy;
  created_at: string;
  updated_at: string;
  /** Encrypted secret connection material (empty for local-k8s). */
  secrets?: Record<string, string>;
}

/** Attributes that must never be touched by a partial update (encrypted + AAD). */
export const SANDBOX_PROFILE_ATTRIBUTES_TO_ENCRYPT = ['secrets'] as const;
export const SANDBOX_PROFILE_ATTRIBUTES_IN_AAD = ['provider', 'created_at'] as const;

export const sandboxProfileSavedObjectType: SavedObjectsType = {
  name: SANDBOX_PROFILE_SO_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  management: {
    importableAndExportable: false,
  },
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'keyword' },
      provider: { type: 'keyword' },
      runtime: { type: 'keyword' },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
      // connection / runtime_config / policy / secrets are not searched; keep them
      // out of the mappings (dynamic:false) so we don't index arbitrary shapes.
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {},
    },
  },
};
