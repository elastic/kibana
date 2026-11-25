/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A secret without its value: what list and write operations return. */
export interface SecretMetadata {
  /** Unique per space and lowercase. Immutable, because consumers reference it. */
  readonly name: string;
  readonly description?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
}

/** What a caller supplies to create a secret. */
export interface CreateSecretParams extends Pick<SecretMetadata, 'name' | 'description'> {
  readonly value: string;
}

/**
 * What a caller supplies to update the value of a secret, its description, or both.
 * An omitted value keeps the current one. An omitted description keeps the current one and
 * an empty one clears it.
 */
export interface UpdateSecretParams extends Pick<SecretMetadata, 'name' | 'description'> {
  readonly value?: string;
}

export type DeleteSecretParams = Pick<SecretMetadata, 'name'>;
