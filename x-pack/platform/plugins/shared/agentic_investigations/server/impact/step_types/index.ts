/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { ResolveProposalUser } from '../../proposals/services/resolve_proposal_user';
import type { ImpactService } from '../services/impact_service';
import type { ImpactPrivilegesChecker } from '../services/check_impact_privileges';
import { getAttachImpactStepDefinition } from './attach_impact_step';
import { getGetImpactStepDefinition } from './get_impact_step';

/** Registers Impact's workflow steps during plugin setup. */
export const registerImpactStepDefinitions = ({
  workflowsExtensions,
  getImpactService,
  resolveUser,
  privileges,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getImpactService: () => ImpactService;
  resolveUser: ResolveProposalUser;
  privileges: ImpactPrivilegesChecker;
}) => {
  workflowsExtensions.registerStepDefinition(
    getAttachImpactStepDefinition({ getImpactService, resolveUser, privileges })
  );
  workflowsExtensions.registerStepDefinition(
    getGetImpactStepDefinition({ getImpactService, privileges })
  );
};
