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
  SecretConnectorsResponse,
  SecretMetadata,
  SecretsListResponse,
  SecretTestResult,
  TestSecretParams,
  WriteSecretParams,
} from '@kbn/secrets';

export type SecretsHttpError = IHttpFetchError<ResponseErrorBody>;

/** The routes of a consumer of secrets. Each consumer registers its own. */
export interface SecretsApiRoutes {
  /** `GET` lists the secrets, `POST` creates one. */
  readonly secrets: string;
  /** `PUT` replaces and `DELETE` deletes the secret named by its `{name}` parameter. */
  readonly secret: string;
  /** `POST` checks that the secret named by its `{name}` parameter can be read. */
  readonly secretTest: string;
  /** `GET` lists the connectors that can hold secrets and that the user may access. */
  readonly secretConnectors: string;
}

/** Calls the routes of one consumer of secrets. No call ever returns the value of a secret. */
export interface SecretsApi {
  readonly routes: SecretsApiRoutes;
  readonly listSecrets: () => Promise<SecretsListResponse>;
  readonly createSecret: (params: WriteSecretParams) => Promise<SecretMetadata>;
  /** Replaces the source and the description of a secret. Its name cannot change. */
  readonly replaceSecret: (params: WriteSecretParams) => Promise<SecretMetadata>;
  readonly deleteSecret: (params: DeleteSecretParams) => Promise<void>;
  readonly testSecret: (params: TestSecretParams) => Promise<SecretTestResult>;
  readonly listSecretConnectors: () => Promise<SecretConnectorsResponse>;
}

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
  replaceSecret: ({ name, description, source }) =>
    http.put<SecretMetadata>(buildPath(routes.secret, { name }), {
      body: JSON.stringify({ description, source }),
    }),
  deleteSecret: ({ name }) => http.delete<void>(buildPath(routes.secret, { name })),
  testSecret: ({ name }) => http.post<SecretTestResult>(buildPath(routes.secretTest, { name })),
  listSecretConnectors: () => http.get<SecretConnectorsResponse>(routes.secretConnectors),
});

/** The server explains what is wrong with a request (a bad reference, a taken name) in its body. */
export const getSecretsErrorMessage = (error: SecretsHttpError): string =>
  error.body?.message ?? error.message;
