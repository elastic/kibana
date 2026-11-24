/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type {
  DeleteSecretParams,
  UpdateSecretParams,
  SecretConnectorsResponse,
  SecretMetadata,
  SecretsListResponse,
  SecretTestResult,
  SecretUsageCountsResponse,
  SecretUsageResponse,
  TestSecretParams,
  WriteSecretParams,
} from '@kbn/secrets';

export type SecretsHttpError = IHttpFetchError<ResponseErrorBody>;

/** The routes of a consumer of secrets. Each consumer registers its own. */
export interface SecretsApiRoutes {
  /** `GET` lists the secrets, `POST` creates one. */
  readonly secrets: string;
  /** `PATCH` updates and `DELETE` deletes the secret named by its `{name}` parameter. */
  readonly secret: string;
  /** `POST` checks that the secret named by its `{name}` parameter can be read. */
  readonly secretTest: string;
  /** `GET` lists the connectors that can hold secrets and that the user may access. */
  readonly secretConnectors: string;
  /** Leave out when the consumer cannot tell where its secrets are used. */
  readonly usage?: {
    /** `GET` counts the items that use each secret. */
    readonly secrets: string;
    /** `GET` lists the items that use the secret named by its `{name}` parameter. */
    readonly secret: string;
  };
}

/** Which items of a consumer use its secrets. Only what the user is allowed to see is listed. */
export interface SecretsUsageApi {
  readonly getSecretsUsage: () => Promise<SecretUsageCountsResponse>;
  readonly getSecretUsage: (params: { name: string }) => Promise<SecretUsageResponse>;
}

/** Calls the routes of one consumer of secrets. No call ever returns the value of a secret. */
export interface SecretsApi {
  readonly routes: SecretsApiRoutes;
  readonly listSecrets: () => Promise<SecretsListResponse>;
  readonly createSecret: (params: WriteSecretParams) => Promise<SecretMetadata>;
  /** Updates the source of a secret, its description, or both. Its name cannot change. */
  readonly updateSecret: (params: UpdateSecretParams) => Promise<SecretMetadata>;
  readonly deleteSecret: (params: DeleteSecretParams) => Promise<void>;
  readonly testSecret: (params: TestSecretParams) => Promise<SecretTestResult>;
  readonly listSecretConnectors: () => Promise<SecretConnectorsResponse>;
  /** Absent when the consumer does not provide the usage routes. */
  readonly usage?: SecretsUsageApi;
}

const createSecretsUsageApi = ({
  http,
  routes,
}: {
  http: HttpSetup;
  routes: NonNullable<SecretsApiRoutes['usage']>;
}): SecretsUsageApi => ({
  getSecretsUsage: () => http.get<SecretUsageCountsResponse>(routes.secrets),
  getSecretUsage: ({ name }) => http.get<SecretUsageResponse>(buildPath(routes.secret, { name })),
});

export const createSecretsApi = ({
  http,
  routes,
}: {
  http: HttpSetup;
  routes: SecretsApiRoutes;
}): SecretsApi => ({
  routes,
  listSecrets: () => http.get<SecretsListResponse>(routes.secrets),
  createSecret: (secret) =>
    http.post<SecretMetadata>(routes.secrets, { body: JSON.stringify(secret) }),
  updateSecret: ({ name, description, source }) =>
    http.patch<SecretMetadata>(buildPath(routes.secret, { name }), {
      body: JSON.stringify({ description, source }),
    }),
  deleteSecret: ({ name }) => http.delete<void>(buildPath(routes.secret, { name })),
  testSecret: ({ name }) => http.post<SecretTestResult>(buildPath(routes.secretTest, { name })),
  listSecretConnectors: () => http.get<SecretConnectorsResponse>(routes.secretConnectors),
  usage: routes.usage && createSecretsUsageApi({ http, routes: routes.usage }),
});

/** The server explains what is wrong with a request (a bad reference, a taken name) in its body. */
export const getSecretsErrorMessage = (error: SecretsHttpError): string =>
  error.body?.message ?? error.message;
