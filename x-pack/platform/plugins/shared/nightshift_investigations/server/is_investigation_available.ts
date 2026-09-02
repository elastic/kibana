/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID } from '@kbn/significant-events-schema';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

export const isInvestigationAvailable = async ({
  request,
  agentBuilder,
  searchInferenceEndpoints,
  spaces,
  workflowsExtensions,
  workflowsManagement,
}: {
  request: KibanaRequest;
  agentBuilder?: AgentBuilderPluginStart;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
  workflowsManagement?: WorkflowsServerPluginSetup;
}): Promise<boolean> => {
  if (!agentBuilder || !searchInferenceEndpoints || !workflowsExtensions || !workflowsManagement) {
    return false;
  }

  const spaceId = spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
  const [workflow, { endpoints }] = await Promise.all([
    workflowsManagement.management.getWorkflow(
      SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
      spaceId
    ),
    searchInferenceEndpoints.endpoints.getForFeature(
      SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
      request
    ),
  ]);

  return Boolean(
    workflow?.enabled && workflow.valid && workflow.definition && endpoints.length > 0
  );
};
