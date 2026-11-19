/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_CONFIGURATION_REQUIRED = i18n.translate(
  'workflows.components.workflows.noConfigurationRequired',
  {
    defaultMessage:
      'No configuration required. This connector uses the internal Kibana workflows API.',
  }
);

export const WORKFLOW_ID_LABEL = i18n.translate(
  'workflows.components.workflows.workflowIdTextFieldLabel',
  {
    defaultMessage: 'Select Workflow',
  }
);

export const WORKFLOW_ID_REQUIRED = i18n.translate(
  'workflows.components.workflows.error.requiredWorkflowIdText',
  {
    defaultMessage: 'Workflow ID is required.',
  }
);
