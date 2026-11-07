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
import type { InvestigationsClient } from '../services/investigations_client';
import type { FindingsWriter } from '../../findings/findings_writer';
import {
  getCreateInvestigationStepDefinition,
  getPatchInvestigationStepDefinition,
  getSetHypothesesStepDefinition,
} from './write_investigation_steps';

/** Registers Investigation's workflow steps during plugin setup. */
export const registerInvestigationStepDefinitions = ({
  workflowsExtensions,
  getInvestigationStatusService,
  getConversationClient,
  getInvestigationsClient,
  getFindingsWriter,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getInvestigationStatusService: () => InvestigationStatusService;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  getInvestigationsClient: (request: KibanaRequest) => InvestigationsClient;
  getFindingsWriter: (request: KibanaRequest) => FindingsWriter;
}) => {
  workflowsExtensions.registerStepDefinition(
    getReopenInvestigationStepDefinition({ getInvestigationStatusService, getConversationClient })
  );
  workflowsExtensions.registerStepDefinition(
    getCreateInvestigationStepDefinition({ getInvestigationsClient })
  );
  workflowsExtensions.registerStepDefinition(
    getPatchInvestigationStepDefinition({ getInvestigationsClient })
  );
  workflowsExtensions.registerStepDefinition(getSetHypothesesStepDefinition({ getFindingsWriter }));
};
