/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { ProposalsService } from '../services/proposals_service';
import { getCreateProposalStepDefinition } from './create_proposal_step';
import { getSaveProposalResultStepDefinition } from './save_proposal_result_step';

export const registerStepDefinitions = ({
  workflowsExtensions,
  getProposalsService,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getProposalsService: () => ProposalsService;
}) => {
  workflowsExtensions.registerStepDefinition(
    getCreateProposalStepDefinition({ getProposalsService })
  );
  workflowsExtensions.registerStepDefinition(
    getSaveProposalResultStepDefinition({ getProposalsService })
  );
};

export { getCreateProposalStepDefinition } from './create_proposal_step';
export { getSaveProposalResultStepDefinition } from './save_proposal_result_step';
