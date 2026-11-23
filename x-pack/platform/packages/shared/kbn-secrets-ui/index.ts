/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createSecretsApi, getSecretsErrorMessage } from './src/api';
export type { SecretsApi, SecretsApiRoutes, SecretsHttpError } from './src/api';
export { SecretsManagement } from './src/secrets_management';
export type { SecretsManagementProps } from './src/secrets_management';
export {
  useCreateSecret,
  useDeleteSecret,
  useReplaceSecret,
  useTestSecret,
} from './src/use_secret_mutations';
export { useSecretConnectors, useSecrets } from './src/use_secrets';
