/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecretEntry, SecretMetadata } from './types';

/** A secret as read from storage, with the version to pass back when replacing it. */
export interface StoredSecret {
  readonly entry: SecretEntry;
  /** Opaque. Changes on every write. */
  readonly version: string;
}

/** Persistence for the secrets of one space. */
export interface SecretsStorage {
  /** Lists the secrets that this consumer may use, without their values. */
  list(params: { consumer: string }): Promise<SecretMetadata[]>;
  /** Returns the secret with its value, or `undefined` when no secret has this name. */
  get(params: { name: string }): Promise<StoredSecret | undefined>;
  /** Throws `SecretAlreadyExistsError` when the name is taken. */
  create(params: { entry: SecretEntry }): Promise<void>;
  /**
   * Overwrites the whole secret that has the same name. Throws `SecretConflictError` when the
   * secret was written or deleted after `version` was read.
   */
  replace(params: { entry: SecretEntry; version: string }): Promise<void>;
  /** Throws `SecretNotFoundError` when no secret has this name. */
  delete(params: { name: string }): Promise<void>;
}
