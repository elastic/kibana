/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowRunFixture } from '@kbn/workflows-execution-engine/test_helpers';
import type { ProposalsService } from '../server/services/proposals_service';
import type { ProposalPrivilegesChecker } from '../server/services/check_proposal_privileges';
import { getCheckDecidePrivilegesStepDefinition } from '../server/step_types/check_decide_privileges_step';
import { getCloneProposalStepDefinition } from '../server/step_types/clone_proposal_step';
import { getCreateProposalStepDefinition } from '../server/step_types/create_proposal_step';
import { getGetLatestRevisionStepDefinition } from '../server/step_types/get_latest_revision_step';
import { getGetProposalStepDefinition } from '../server/step_types/get_proposal_step';
import { getUpdateProposalStepDefinition } from '../server/step_types/update_proposal_step';

/**
 * Points the engine's step registry at the real handlers.
 *
 * `nodes_factory` resolves a custom step through
 * `workflowsExtensions.getStepDefinition`, which the engine fixture supplies as
 * a mock — so the real definitions can be dropped in without the plugin's
 * `setup()` having run.
 */
export const registerStepDefinitionsForTest = ({
  engine,
  getProposalsService,
  privileges,
}: {
  engine: WorkflowRunFixture;
  getProposalsService: () => ProposalsService;
  privileges: ProposalPrivilegesChecker;
}) => {
  // The execution runs under a fake request with no principal, so the step's
  // own resolution yields nothing and `decidedBy` falls back to the username
  // the workflow carries from the gate output — the same degradation a resume
  // by an API key takes.
  const resolveUser = async () => undefined;

  const definitions = [
    getCreateProposalStepDefinition({ getProposalsService, resolveUser, privileges }),
    getUpdateProposalStepDefinition({ getProposalsService, resolveUser, privileges }),
    getCheckDecidePrivilegesStepDefinition({ privileges }),
    getGetProposalStepDefinition({ getProposalsService, privileges }),
    getCloneProposalStepDefinition({ getProposalsService, privileges }),
    getGetLatestRevisionStepDefinition({ getProposalsService, privileges }),
  ];

  const byId = new Map(definitions.map((definition) => [definition.id, definition]));

  // Both, because `nodes_factory` guards the lookup on `hasStepDefinition`.
  // With only the getter stubbed the branch is skipped and the engine falls
  // through to the connector path, where `proposals.createProposal` reads
  // as a connector in an `investigations` namespace.
  engine.dependencies.workflowsExtensions.hasStepDefinition = jest.fn((stepType: string) =>
    byId.has(stepType)
  ) as never;
  engine.dependencies.workflowsExtensions.getStepDefinition = jest.fn((stepType: string) =>
    byId.get(stepType)
  ) as never;
};
