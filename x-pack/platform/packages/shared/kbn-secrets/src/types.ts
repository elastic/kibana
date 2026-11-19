/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SECRET_PROVIDER_TYPE } from './constants';

export type SecretProviderType = (typeof SECRET_PROVIDER_TYPE)[keyof typeof SECRET_PROVIDER_TYPE];

/** A value stored encrypted in Kibana. */
export interface KibanaSecretSource {
  readonly provider: typeof SECRET_PROVIDER_TYPE.kibana;
  readonly value: string;
}

/** A value that lives in an external manager and is fetched through a connector. */
export interface ConnectorSecretSource {
  readonly provider: typeof SECRET_PROVIDER_TYPE.connector;
  readonly connectorId: string;
  /** Location of the value inside the external manager. Not secret. */
  readonly reference: string;
}

/** Where a secret gets its value from. */
export type SecretSource = KibanaSecretSource | ConnectorSecretSource;

/** What every secret has, whatever its source. */
export interface SecretDetails {
  /** Unique per space, regardless of case. Immutable, because consumers reference it. */
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
export type ConnectorSecretEntry = SecretDetails & ConnectorSecretSource;

/** A secret as stored: its details and its source. */
export type SecretEntry = KibanaSecretEntry | ConnectorSecretEntry;

/** What list and write operations return: a secret without its value. */
export type SecretMetadata = Omit<KibanaSecretEntry, 'value'> | ConnectorSecretEntry;

/** What a caller supplies to create a secret, or to replace an existing one as a whole. */
export interface WriteSecretParams extends Pick<SecretDetails, 'name' | 'description'> {
  readonly source: SecretSource;
}

export type DeleteSecretParams = Pick<SecretDetails, 'name'>;

export interface ResolveSecretsParams {
  readonly names: readonly string[];
}

export interface SecretResolutionFailure {
  readonly name: string;
  /** Why the value could not be obtained. Never contains a value. */
  readonly message: string;
}

export interface ResolvedSecrets {
  readonly values: ReadonlyMap<string, string>;
  /** Requested names that do not exist or that the consumer may not use. */
  readonly missing: readonly string[];
  /** Secrets that exist but whose value could not be obtained. */
  readonly failed: readonly SecretResolutionFailure[];
}

/** Turns a secret entry into its value. One implementation per provider type. */
export interface SecretProvider<TEntry extends SecretEntry = SecretEntry> {
  readonly type: TEntry['provider'];
  resolve(params: { entry: TEntry }): Promise<string>;
}

/** The providers a secrets client can use, by provider type. */
export interface SecretProviders {
  readonly kibana: SecretProvider<KibanaSecretEntry>;
  /** Absent when secrets from external managers are not available. */
  readonly connector?: SecretProvider<ConnectorSecretEntry>;
}

/** Secrets of one space, as seen by one consumer feature. */
export interface SecretsClient {
  list(): Promise<SecretMetadata[]>;
  create(params: WriteSecretParams): Promise<SecretMetadata>;
  replace(params: WriteSecretParams): Promise<SecretMetadata>;
  delete(params: DeleteSecretParams): Promise<void>;
  /** The only operation that returns values. Server-side use only. */
  resolve(params: ResolveSecretsParams): Promise<ResolvedSecrets>;
}

export interface GetSecretsClientParams {
  readonly request: KibanaRequest;
  /** Id of the feature asking, checked against each secret's allowed consumers. */
  readonly consumer: string;
}
