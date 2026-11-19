/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { WorkflowsManagementApiActions, WorkflowsManagementUiActions } from '@kbn/workflows';

/** The privileges of workflow secrets. Neither is part of the "All" or "Read" presets. */
export const workflowSecretsSubFeature: SubFeatureConfig = {
  name: i18n.translate('workflows.featureRegistry.secretsSubFeatureName', {
    defaultMessage: 'Secrets',
  }),
  description: i18n.translate('workflows.featureRegistry.secretsSubFeatureDescription', {
    defaultMessage: 'Secret actions need explicit assignment',
  }),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          id: 'workflow_secrets_manage',
          name: i18n.translate('workflows.featureRegistry.manageSecretsSubFeaturePrivilege', {
            defaultMessage: 'Manage secrets',
          }),
          includeIn: 'none',
          // Secrets are saved objects, but Workflows reaches them only through the secrets plugin.
          savedObject: { all: [], read: [] },
          api: [WorkflowsManagementApiActions.manageSecrets],
          ui: [WorkflowsManagementUiActions.manageSecrets],
        },
        {
          id: 'workflow_secrets_use',
          name: i18n.translate('workflows.featureRegistry.useSecretsSubFeaturePrivilege', {
            defaultMessage: 'Use secrets in workflow runs',
          }),
          includeIn: 'none',
          savedObject: { all: [], read: [] },
          api: [WorkflowsManagementApiActions.useSecrets],
          ui: [WorkflowsManagementUiActions.useSecrets],
        },
      ],
    },
  ],
};
