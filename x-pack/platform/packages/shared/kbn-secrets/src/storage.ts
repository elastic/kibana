/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecretEntry, SecretMetadata } from './types';

/**
 * Persistence for the secrets of one space. Implementations treat names as equal
 * regardless of case, and never return a value from `list`.
 */
export interface SecretsStorage {
  list(): Promise<SecretMetadata[]>;
  /** Returns the entry with its value, or `undefined` when no secret has this name. */
  get(params: { name: string }): Promise<SecretEntry | undefined>;
  /** Throws `SecretAlreadyExistsError` when the name is taken. */
  create(params: { entry: SecretEntry }): Promise<void>;
  /** Overwrites the whole entry that has the same name. */
  replace(params: { entry: SecretEntry }): Promise<void>;
  /** Throws `SecretNotFoundError` when no secret has this name. */
  delete(params: { name: string }): Promise<void>;
}
