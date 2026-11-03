/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { AttachmentPublicClient, AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { registerProposalAttachment } from './attachments';
import { createProposalManagementSkill } from './agent_builder/skills/proposal_management';
import { reviseProposalTool } from './agent_builder/tools/revise_proposal_tool';
import { createProposalCreator } from './services/create_proposal';
import { createProposalUserResolver } from './services/resolve_proposal_user';
import type { ResolveProposalUser } from './services/resolve_proposal_user';
import { createWorkerUserResolver } from './services/resolve_worker_user';
import type { ResolveWorkerUser } from './services/resolve_worker_user';
import type { ProposalPrivilegesChecker } from './services/check_proposal_privileges';
import { ProposalsService } from './services/proposals_service';
import { registerStepDefinitions } from './step_types';
import { createProposalsStorageClient } from './storage/proposals_storage';
import { createProposalTool } from './tools/create_proposal_tool';
import type { ProposalsPluginStart } from './types';

/**
 * What the `server` entry (Kibana) and the `server/tasks` entry (task pods) both build: the same
 * registrations and the same services, over the contracts each of them has.
 */

type WorkflowsApi = WorkflowsServerPluginSetup['management'];

interface RegistrationDeps {
  agentBuilder: AgentBuilderPluginSetup;
  workflowsExtensions: Pick<WorkflowsExtensionsServerPluginSetup, 'registerStepDefinition'>;
  logger: Logger;
  privileges: ProposalPrivilegesChecker;
  getProposalsService: () => ProposalsService;
  getWorkflowsApi: () => WorkflowsApi;
  resolveUser: ResolveProposalUser;
  resolveWorkerUser: ResolveWorkerUser;
}

/** The agent builder tools, skill and attachment, and the workflow steps, of proposals. */
export const registerProposalsContributions = ({
  agentBuilder,
  workflowsExtensions,
  logger,
  privileges,
  getProposalsService,
  getWorkflowsApi,
  resolveUser,
  resolveWorkerUser,
}: RegistrationDeps) => {
  agentBuilder.tools.register(reviseProposalTool({ getProposalsService, privileges }));
  agentBuilder.skills.register(
    createProposalManagementSkill((request) => privileges.canManage(request))
  );

  // The service only exists from start() onwards, but `format()` is never
  // called before then, so it is resolved lazily rather than captured here.
  // Reads go through the internal user, so the formatter has to check the
  // caller's privilege itself — same as every other proposal read surface.
  registerProposalAttachment(agentBuilder, { getProposalsService, privileges, logger });

  // Lets an agent propose an action in its own conversation through the gate workflow.
  // Registered in setup but run only after start, so the service is resolved per call.
  agentBuilder.tools.register(
    createProposalTool({ getProposalsService, getWorkflowsApi, privileges, logger })
  );

  registerStepDefinitions({
    workflowsExtensions,
    getProposalsService,
    resolveUser,
    resolveWorkerUser,
    privileges,
  });
};

export interface ProposalsServices {
  proposalsService: ProposalsService;
  resolveUser: ResolveProposalUser;
  resolveWorkerUser: ResolveWorkerUser;
}

/** The services that exist from start: user resolution and the proposals service. */
export const createProposalsServices = ({
  core,
  logger,
  getWorkflowsApi,
  getAttachmentsClient,
}: {
  core: Pick<CoreStart, 'userProfile' | 'security'> & {
    elasticsearch: Pick<CoreStart['elasticsearch'], 'client'>;
  };
  logger: Logger;
  getWorkflowsApi: () => WorkflowsApi;
  getAttachmentsClient: (request: KibanaRequest) => Promise<AttachmentPublicClient>;
}): ProposalsServices => {
  const resolveUser = createProposalUserResolver({
    userProfile: core.userProfile,
    security: core.security,
    logger,
  });
  const resolveWorkerUser = createWorkerUserResolver({
    security: core.security,
    getWorkflowsApi,
    logger,
  });

  // Reads and writes go through the internal user; authorization is enforced
  // at the API layer.
  const storage = createProposalsStorageClient({
    esClient: core.elasticsearch.client.asInternalUser,
    logger,
  });

  return {
    proposalsService: new ProposalsService({
      storage,
      logger,
      getWorkflowsApi,
      getAttachmentsClient,
    }),
    resolveUser,
    resolveWorkerUser,
  };
};

/** The contract other plugins get, so they reach a proposal in-process rather than over HTTP. */
export const createProposalsStart = ({
  proposalsService,
  getWorkflowsApi,
  privileges,
}: {
  proposalsService: ProposalsService;
  getWorkflowsApi: () => WorkflowsApi;
  privileges: ProposalPrivilegesChecker;
}): ProposalsPluginStart => ({
  getProposalsService: () => proposalsService,
  getProposalPrivileges: () => privileges,
  createProposal: createProposalCreator({
    getProposalsService: () => proposalsService,
    getWorkflowsApi,
    privileges,
  }).create,
});
