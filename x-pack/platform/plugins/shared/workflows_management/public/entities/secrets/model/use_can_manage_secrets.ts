/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WORKFLOWS_MANAGEMENT_FEATURE_ID } from '@kbn/workflows';
import { WorkflowsManagementUiActions } from '@kbn/workflows/common/privileges';
import { useKibana } from '../../../hooks/use_kibana';

/**
 * Whether the user may create, update, delete and test secrets. The capability only exists when
 * the secrets plugin is enabled, because the privilege is registered together with its routes.
 */
export const useCanManageSecrets = (): boolean => {
  const { application } = useKibana().services;
  return Boolean(
    application.capabilities[WORKFLOWS_MANAGEMENT_FEATURE_ID]?.[
      WorkflowsManagementUiActions.manageSecrets
    ]
  );
};
