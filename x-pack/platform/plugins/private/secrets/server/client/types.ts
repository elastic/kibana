/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateSecretParams,
  DeleteSecretParams,
  SecretMetadata,
  UpdateSecretParams,
} from '@kbn/secrets';

/** A secret as stored, value included. Never leaves the server. */
export interface SecretEntry extends SecretMetadata {
  readonly value: string;
}

/**
 * The secrets of one space. No operation returns a value.
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
   * Throws `SecretValidationError` when the change breaks a rule or has neither a value nor a
   * description, `SecretNotFoundError` when the space has no secret with this name, and
   * `SecretConflictError` when another request changed the secret during the update.
   */
  update(params: UpdateSecretParams): Promise<SecretMetadata>;
  /** Throws `SecretNotFoundError` when the space has no secret with this name. */
  delete(params: DeleteSecretParams): Promise<void>;
}
