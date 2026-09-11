/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
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
  logger,
  searchInferenceEndpoints,
  spaceId,
  spaces,
  workflowsExtensions,
  workflowsManagement,
}: {
  request: KibanaRequest;
  agentBuilder?: AgentBuilderPluginStart;
  logger: Logger;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  spaceId?: string;
  spaces?: SpacesPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
  workflowsManagement?: WorkflowsServerPluginSetup;
}): Promise<boolean> => {
  if (!agentBuilder || !searchInferenceEndpoints || !workflowsExtensions || !workflowsManagement) {
    return false;
  }

  try {
    const resolvedSpaceId =
      spaceId ?? spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
    const [workflow, { endpoints }] = await Promise.all([
      workflowsManagement.management.getWorkflow(
        SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
        resolvedSpaceId
      ),
      searchInferenceEndpoints.endpoints.getForFeature(
        SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
        request
      ),
    ]);

    return Boolean(workflow?.definition && endpoints.length > 0);
  } catch (error) {
    logger.warn(`Failed to check investigation availability: ${String(error)}`);
    return false;
  }
};
