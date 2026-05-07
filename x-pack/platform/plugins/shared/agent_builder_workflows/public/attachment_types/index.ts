/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { CoreStart } from '@kbn/core/public';
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
} from '@kbn/workflows/common/constants';
import type { WorkflowsPublicPluginStart } from '@kbn/workflows-management-plugin/public';
import { createWorkflowYamlAttachmentUiDefinition } from './workflow_yaml_attachment_renderer';
import { workflowYamlDiffAttachmentUiDefinition } from './workflow_yaml_diff_attachment_renderer';

export const registerWorkflowAttachmentRenderers = (
  attachments: AttachmentServiceStartContract,
  services: {
    core: CoreStart;
    telemetry: WorkflowsPublicPluginStart['telemetry'];
    queryClient: WorkflowsPublicPluginStart['queryClient'];
  }
): void => {
  attachments.addAttachmentType(
    WORKFLOW_YAML_ATTACHMENT_TYPE,
    createWorkflowYamlAttachmentUiDefinition(services)
  );
  attachments.addAttachmentType(
    WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
    workflowYamlDiffAttachmentUiDefinition
  );
};
