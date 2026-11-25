/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SECRET_PROVIDER_TYPE } from './constants';

export type SecretProviderType = (typeof SECRET_PROVIDER_TYPE)[keyof typeof SECRET_PROVIDER_TYPE];

/** A value stored encrypted in Kibana. */
export interface KibanaSecretSource {
  readonly provider: typeof SECRET_PROVIDER_TYPE.kibana;
  readonly value: string;
}

/** Where a secret gets its value from. */
export type SecretSource = KibanaSecretSource;

/** What every secret has, whatever its source. */
export interface SecretDetails {
  /** Unique per space and lowercase. Immutable, because consumers reference it. */
  readonly name: string;
  readonly description?: string;
  /**
   * Ids of the features allowed to use this secret. One secret can serve several features, the
   * way one connector serves Workflows and Agent Builder. Workflows is the only consumer today:
   * if secrets stay a Workflows-only feature, this field and its checks can be removed.
   */
  readonly allowedConsumers: readonly string[];
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
}

export type KibanaSecretEntry = SecretDetails & KibanaSecretSource;

/** A secret as stored: its details and its source. */
export type SecretEntry = KibanaSecretEntry;

/** A secret stored in Kibana, without its value. */
export type KibanaSecretMetadata = Omit<KibanaSecretEntry, 'value'>;

/** What list and write operations return: a secret without its value. */
export type SecretMetadata = KibanaSecretMetadata;

/** What a caller supplies to create a secret. */
export interface CreateSecretParams extends Pick<SecretDetails, 'name' | 'description'> {
  readonly source: SecretSource;
}

/**
 * What a caller supplies to update the source of a secret, its description, or both.
 * An omitted source keeps the current one. An omitted description keeps the current one and
 * an empty one clears it.
 */
export interface UpdateSecretParams extends Pick<SecretDetails, 'name' | 'description'> {
  readonly source?: SecretSource;
}

export type DeleteSecretParams = Pick<SecretDetails, 'name'>;

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
