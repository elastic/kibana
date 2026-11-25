/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateSecretParams,
  DeleteSecretParams,
  KibanaSecretSource,
  SecretDetails,
  SecretMetadata,
  UpdateSecretParams,
} from '@kbn/secrets';

export type KibanaSecretEntry = SecretDetails & KibanaSecretSource;

/** A secret as stored: its details and its source, value included. Never leaves the server. */
export type SecretEntry = KibanaSecretEntry;

/**
 * Secrets of one space, as seen by one consumer feature. No operation returns a value.
 * Every operation throws `SecretsUnavailableError` when secrets cannot be used in this Kibana.
 */
export interface SecretsClient {
  list(): Promise<SecretMetadata[]>;
  /**
   * Throws `SecretValidationError` when the secret breaks a rule, and
   * `SecretAlreadyExistsError` when the space already has a secret with this name.
   */
  create(params: CreateSecretParams): Promise<SecretMetadata>;
  /**
   * Throws `SecretValidationError` when the change breaks a rule or changes nothing,
   * `SecretNotFoundError` when the consumer has no secret with this name, and
   * `SecretConflictError` when another request changed the secret during the update.
   */
  update(params: UpdateSecretParams): Promise<SecretMetadata>;
  /** Throws `SecretNotFoundError` when the consumer has no secret with this name. */
  delete(params: DeleteSecretParams): Promise<void>;
}
