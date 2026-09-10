/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest } from '@kbn/core/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { registerAnonymizationSettingsRoutes } from './anonymization_settings';
import { registerAnonymizationPreviewRoute } from './anonymization_preview';

interface SpacesLike {
  getSpaceId(request: KibanaRequest): string;
}

export const registerRoutes = ({
  router,
  spaces,
  management,
  getClient,
  baseFailureMode,
  serverSalt,
}: {
  router: IRouter;
  spaces: SpacesLike;
  management: WorkflowsManagementApi;
  getClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  baseFailureMode: 'block' | 'allow_unsafe';
  serverSalt: string | undefined;
}) => {
  registerAnonymizationSettingsRoutes({ router, spaces, management, getClient, baseFailureMode });
  registerAnonymizationPreviewRoute({ router, serverSalt });
};
