/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';

/**
 * One credential as the config-distributor `credentials[]` sidecar expects: the name a
 * `{ credential: <name> }` config value references, and the `v1.<kid>.<iv>.<ct>` blob sealed
 * under the project AES-256-GCM wrap key with `target_id` as AAD.
 */
export interface UnitCredential {
  name: string;
  ciphertext: string;
}

/** A sealed credential as persisted next to the unit, so an unchanged secret keeps its blob. */
export interface StoredUnitCredential {
  name: string;
  /** The `target_id` the blob is bound to (AES-GCM AAD). */
  target: string;
  ciphertext: string;
}

/** Credentials sealed once per save. Validate and publish receive the same `credentials`. */
export interface PreparedCredentials {
  credentials: UnitCredential[];
  /** What to persist, so the next save can reuse unchanged blobs. */
  sealed: StoredUnitCredential[];
}

export interface PrepareCredentialsInput {
  /** The secrets to seal, already merged with the stored ones and pruned to referenced names. */
  secrets: StreamsUnit.Secrets;
  /** What the configuration saved object held before this save. */
  previous: { secrets: StreamsUnit.Secrets; sealed: StoredUnitCredential[] };
}

export type PrepareUnitCredentials = (
  input: PrepareCredentialsInput
) => Promise<PreparedCredentials>;

export interface ValidateUnitConfigParams {
  unit: StreamsUnit.Configuration;
  credentials: UnitCredential[];
  signal?: AbortSignal;
}

export type ValidateUnitConfig = (
  params: ValidateUnitConfigParams
) => Promise<UnitValidationResult>;

export interface PublishUnitConfigParams {
  unitId: string;
  unit: StreamsUnit.Configuration;
  credentials: UnitCredential[];
  signal?: AbortSignal;
}

export type PublishUnitConfig = (params: PublishUnitConfigParams) => Promise<void>;

/**
 * Result of config-distributor `POST /v1/units/validate` when the unit compiles.
 * `compiled_config` is the raw OpenTelemetry collector YAML when the
 * distributor returns it.
 */
export interface UnitValidationResult {
  compiled_config?: string;
}

/**
 * Backend-owned unit config steps. The config-distributor client supplies
 * `validate` and `publish`. Neither seals: the unit service prepares
 * credentials once and passes the same set to both.
 */
export interface UnitConfigHooks {
  /**
   * Unit validation via config-distributor `POST /v1/units/validate`, before the
   * configuration saved object is written. Throw to reject the PUT.
   */
  validate?: ValidateUnitConfig;
  /**
   * Publish the unit to config-distributor `PUT /v1/units/{id}` after the
   * configuration saved object is written.
   */
  publish?: PublishUnitConfig;
  /**
   * Seal each named secret under the project wrap key for the distributor
   * `credentials[]` sidecar. Kibana at-rest protection is Encrypted Saved Objects on `secrets`.
   */
  prepareCredentials?: PrepareUnitCredentials;
}

export type RepublishUnitOutcome =
  | 'republished'
  | 'resealed'
  | 'conflict'
  | 'aborted'
  | 'not_found';
