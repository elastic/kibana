/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { AgentContextLayerPluginStart } from '../types';
import { createSmlIndexAttachmentStepDefinition } from './sml_index_attachment_step';

export const registerAgentContextLayerWorkflowSteps = ({
  workflowsExtensions,
  getStartContract,
  getSpaces,
  getSecurity,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getStartContract: () => AgentContextLayerPluginStart;
  getSpaces: () => SpacesPluginStart | undefined;
  getSecurity: () => SecurityPluginStart | undefined;
}) => {
  workflowsExtensions.registerStepDefinition(
    createSmlIndexAttachmentStepDefinition({ getStartContract, getSpaces, getSecurity })
  );
};
