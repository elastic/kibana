/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';

/**
 * One credential as the config-distributor `PUT /v1/units/{id}` sidecar expects:
 * a name referenced from authored unit YAML, and `base64(nonce || ciphertext || tag)`
 * under the project AES-256-GCM wrap key. Plaintext never appears in `unit_yaml`.
 */
export interface UnitCredential {
  name: string;
  ciphertext: string;
}

/**
 * Sealed sidecar plus a keyed fingerprint of the plaintext. The fingerprint feeds
 * `config_hash`, because GCM ciphertext changes on every seal.
 */
export interface SealedCredentials {
  credentials: UnitCredential[];
  fingerprint: string;
}

export interface PublishUnitConfigParams {
  unitId: string;
  unit: StreamsUnit.Configuration;
  secrets: StreamsUnit.Secrets;
}

export type PublishUnitConfig = (params: PublishUnitConfigParams) => Promise<void>;

export type EncryptUnitCredentials = (secrets: StreamsUnit.Secrets) => Promise<SealedCredentials>;

/**
 * Result of config-distributor `POST /v1/validate` when the unit compiles.
 * `compiled_config` is the raw OpenTelemetry collector YAML when the
 * distributor returns it.
 */
export interface UnitValidationResult {
  compiled_config?: string;
}

/**
 * Backend-owned unit config steps. The config-distributor client supplies
 * `validate` and `publish`.
 */
export interface UnitConfigHooks {
  /**
   * Unit validation via config-distributor `POST /v1/validate`. This is the
   * only unit-document check on the write path. Called before the
   * configuration saved object is written. Throw to reject the PUT.
   * Credentials are not required.
   */
  validate?: (unit: StreamsUnit.Configuration) => Promise<UnitValidationResult>;
  /**
   * Publish the unit to config-distributor `PUT /v1/units/{id}` after the
   * configuration saved object is written.
   */
  publish?: PublishUnitConfig;
  /**
   * Outbound transform: seal each named secret under the project wrap key for the
   * distributor `credentials[]` sidecar. Does not rewrite `unit`.
   * Kibana at-rest protection is Encrypted Saved Objects on `secrets`.
   */
  encryptCredentials?: EncryptUnitCredentials;
}
