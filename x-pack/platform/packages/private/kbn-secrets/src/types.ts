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

/** A secret stored in Kibana, without its value. */
export type KibanaSecretMetadata = SecretDetails & Omit<KibanaSecretSource, 'value'>;

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
