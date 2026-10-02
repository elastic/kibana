/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { getReopenInvestigationStepDefinition } from './reopen_investigation_step';
import type { InvestigationStatusService } from '../services/investigation_status_service';

/** Registers Investigation's workflow steps during plugin setup. */
export const registerInvestigationStepDefinitions = ({
  workflowsExtensions,
  getInvestigationStatusService,
  getConversationClient,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getInvestigationStatusService: () => InvestigationStatusService;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}) => {
  workflowsExtensions.registerStepDefinition(
    getReopenInvestigationStepDefinition({ getInvestigationStatusService, getConversationClient })
  );
};
