/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { ProposalsService } from '../services/proposals_service';
import type { ResolveProposalUser } from '../services/resolve_proposal_user';
import { getCreateProposalStepDefinition } from './create_proposal_step';
import { getUpdateProposalStepDefinition } from './update_proposal_step';
import { getCloneProposalStepDefinition } from './clone_proposal_step';

export const registerStepDefinitions = ({
  workflowsExtensions,
  getProposalsService,
  resolveUser,
  getSecurity,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getProposalsService: () => ProposalsService;
  resolveUser: ResolveProposalUser;
  getSecurity: () => SecurityPluginStart;
}) => {
  workflowsExtensions.registerStepDefinition(
    getCreateProposalStepDefinition({ getProposalsService, resolveUser, getSecurity })
  );
  workflowsExtensions.registerStepDefinition(
    getUpdateProposalStepDefinition({ getProposalsService, getSecurity })
  );
  workflowsExtensions.registerStepDefinition(
    getCloneProposalStepDefinition({ getProposalsService, getSecurity })
  );
};

export { getCreateProposalStepDefinition } from './create_proposal_step';
export { getCloneProposalStepDefinition } from './clone_proposal_step';
export { getUpdateProposalStepDefinition } from './update_proposal_step';
