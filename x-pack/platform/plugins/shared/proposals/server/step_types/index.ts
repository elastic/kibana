/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { ProposalsService } from '../services/proposals_service';
import type { ResolveProposalUser } from '../services/resolve_proposal_user';
import type { ProposalPrivilegesChecker } from '../services/check_proposal_privileges';
import { getCheckDecidePrivilegesStepDefinition } from './check_decide_privileges_step';
import { getCloneProposalStepDefinition } from './clone_proposal_step';
import { getCreateProposalStepDefinition } from './create_proposal_step';
import { getGetLatestRevisionStepDefinition } from './get_latest_revision_step';
import { getGetProposalStepDefinition } from './get_proposal_step';
import { getSettleIncompleteProposalStepDefinition } from './settle_incomplete_proposal_step';
import { getUpdateProposalStepDefinition } from './update_proposal_step';

export const registerStepDefinitions = ({
  workflowsExtensions,
  getProposalsService,
  resolveUser,
  privileges,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getProposalsService: () => ProposalsService;
  resolveUser: ResolveProposalUser;
  privileges: ProposalPrivilegesChecker;
}) => {
  workflowsExtensions.registerStepDefinition(
    getCreateProposalStepDefinition({ getProposalsService, resolveUser, privileges })
  );
  workflowsExtensions.registerStepDefinition(
    getUpdateProposalStepDefinition({ getProposalsService, resolveUser, privileges })
  );
  workflowsExtensions.registerStepDefinition(
    getSettleIncompleteProposalStepDefinition({ getProposalsService })
  );
  workflowsExtensions.registerStepDefinition(
    getCheckDecidePrivilegesStepDefinition({ privileges })
  );
  workflowsExtensions.registerStepDefinition(
    getGetProposalStepDefinition({ getProposalsService, privileges })
  );
  workflowsExtensions.registerStepDefinition(
    getCloneProposalStepDefinition({ getProposalsService, privileges })
  );
  workflowsExtensions.registerStepDefinition(
    getGetLatestRevisionStepDefinition({ getProposalsService, privileges })
  );
};

export { getCheckDecidePrivilegesStepDefinition } from './check_decide_privileges_step';
export { getCloneProposalStepDefinition } from './clone_proposal_step';
export { getCreateProposalStepDefinition } from './create_proposal_step';
export { getGetLatestRevisionStepDefinition } from './get_latest_revision_step';
export { getGetProposalStepDefinition } from './get_proposal_step';
export { getSettleIncompleteProposalStepDefinition } from './settle_incomplete_proposal_step';
export { getUpdateProposalStepDefinition } from './update_proposal_step';
