/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { createSecretsApi } from '@kbn/secrets-ui';
import type { SecretsApi, SecretsApiRoutes } from '@kbn/secrets-ui';
import {
  WORKFLOW_SECRET_ROUTE,
  WORKFLOW_SECRET_TEST_ROUTE,
  WORKFLOW_SECRETS_ROUTE,
} from '../../../../common/lib/secrets/api';
import { useKibana } from '../../../hooks/use_kibana';

const WORKFLOW_SECRETS_API_ROUTES: SecretsApiRoutes = {
  secrets: WORKFLOW_SECRETS_ROUTE,
  secret: WORKFLOW_SECRET_ROUTE,
  secretTest: WORKFLOW_SECRET_TEST_ROUTE,
};

/** Calls the secrets routes of Workflows. */
export const useSecretsApi = (): SecretsApi => {
  const { http } = useKibana().services;
  return useMemo(() => createSecretsApi({ http, routes: WORKFLOW_SECRETS_API_ROUTES }), [http]);
};
