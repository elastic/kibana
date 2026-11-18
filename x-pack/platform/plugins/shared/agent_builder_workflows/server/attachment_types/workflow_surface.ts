/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import type { ComponentsNode } from '@kbn/isomer-components';

/** The title of a workflow's surface composition: its name, or a generic label without one. */
export const toWorkflowTitle = (name?: string): string =>
  name?.trim() ||
  i18n.translate('workflows.agentBuilder.attachments.surface.untitledWorkflow', {
    defaultMessage: 'Workflow',
  });

/** A button that opens the workflow in the Workflows app, or nothing for an unsaved workflow. */
export const toOpenWorkflowButton = (workflowId?: string): ComponentsNode[] =>
  workflowId
    ? [
        {
          type: 'actions',
          buttons: [
            {
              label: i18n.translate('workflows.agentBuilder.attachments.surface.openWorkflow', {
                defaultMessage: 'Open workflow',
              }),
              app: WORKFLOWS_APP_ID,
              path: `/${encodeURIComponent(workflowId)}`,
            },
          ],
        },
      ]
    : [];
