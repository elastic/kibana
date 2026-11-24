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

/** What a consumer's route that lists secrets returns. */
export interface SecretsListResponse {
  /** The secrets the consumer may use, without their values. */
  readonly secrets: SecretMetadata[];
}

/** How many of a consumer's items use a secret, split by whether the requesting user can see them. */
export interface SecretUsageCount {
  /** Items that use the secret and that the requesting user can see. */
  readonly visibleCount: number;
  /** Items that use the secret and that the requesting user cannot see. */
  readonly hiddenCount: number;
}

/** What a consumer's route that counts the items using each secret returns. */
export interface SecretUsageCountsResponse {
  /** The usage of each secret that is in use, by lowercased secret name. */
  readonly counts: Record<string, SecretUsageCount>;
}

/** An item of a consumer that uses a secret. */
export interface SecretUsageItem {
  readonly id: string;
  readonly name: string;
  /** Whether the item is on. A disabled item still breaks when the secret goes away. */
  readonly enabled: boolean;
}

/** What a consumer's route that lists the items using one secret returns. */
export interface SecretUsageResponse extends SecretUsageCount {
  /** Some of the visible items that use the secret, which may be fewer than `visibleCount`. */
  readonly items: SecretUsageItem[];
}

/** A type of connector that can hold secrets. */
export interface SecretConnectorType {
  readonly connectorTypeId: string;
  /** The name of the connector type, for the user. */
  readonly displayName: string;
  /** What a reference looks like for this connector type, as a sentence fragment for a hint. */
  readonly referenceFormat: string;
}

/** A connector that can hold secrets, and that the requesting user may access. */
export interface SecretConnector {
  readonly id: string;
  readonly name: string;
  readonly type: SecretConnectorType;
}

/** What a consumer's route that lists the connectors that can hold secrets returns. */
export interface SecretConnectorsResponse {
  readonly connectors: SecretConnector[];
}

/** What a caller supplies to create a secret. */
export interface WriteSecretParams extends Pick<SecretDetails, 'name' | 'description'> {
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

export type TestSecretParams = Pick<SecretDetails, 'name'>;

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

/** Whether a secret's value could be obtained. Never carries the value. */
export type SecretTestResult =
  | { readonly resolved: true }
  | {
      readonly resolved: false;
      /** Why the value could not be obtained. */
      readonly message: string;
    };

/** Reads values from external secret managers through connectors. */
export interface ConnectorSecretProvider extends SecretProvider<ConnectorSecretEntry> {
  /**
   * Throws `SecretValidationError` when the author of a secret cannot use the connector, the
   * connector is not a secret manager, or the reference is not valid for it.
   */
  validateSource(params: { source: ConnectorSecretSource }): Promise<void>;
  /** Lists the connectors that can hold secrets and that the caller may access. */
  listSecretConnectors(): Promise<SecretConnector[]>;
}

/** The providers a secrets client can use, by provider type. */
export interface SecretProviders {
  readonly kibana: SecretProvider<KibanaSecretEntry>;
  /** Absent when secrets from external managers are not available. */
  readonly connector?: ConnectorSecretProvider;
}

/** Secrets of one space, as seen by one consumer feature. */
export interface SecretsClient {
  list(): Promise<SecretMetadata[]>;
  create(params: WriteSecretParams): Promise<SecretMetadata>;
  update(params: UpdateSecretParams): Promise<SecretMetadata>;
  delete(params: DeleteSecretParams): Promise<void>;
  /**
   * Checks that a stored secret can be read, the way a run reads it, and never returns its
   * value. It needs no access to the connector of the secret. Throws `SecretNotFoundError`
   * when the secret does not exist.
   */
  test(params: TestSecretParams): Promise<SecretTestResult>;
  /**
   * Lists the connectors that can hold secrets and that the caller may access, to choose where
   * a secret lives. Empty when secrets from a connector are not available.
   */
  listSecretConnectors(): Promise<SecretConnector[]>;
  /** The only operation that returns values. Server-side use only. */
  resolve(params: ResolveSecretsParams): Promise<ResolvedSecrets>;
}
