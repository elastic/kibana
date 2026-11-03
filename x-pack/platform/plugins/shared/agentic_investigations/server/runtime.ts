/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  AgentBuilderPluginSetup,
  AttachmentPublicClient,
  ConversationPublicClient,
} from '@kbn/agent-builder-server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { registerEscalationConversationEvents } from './escalations/conversation_events';
import { registerHypothesesAttachment, hypothesesAttachment } from './hypotheses/attachments';
import { HypothesesService } from './hypotheses/services/hypotheses_service';
import { createSetHypothesesTool } from './hypotheses/tools/set_hypotheses_tool';
import { registerImpactAttachment } from './impact/attachments';
import { registerImpactStepDefinitions } from './impact/step_types';
import { createImpactStorageClient } from './impact/storage/impact_storage';
import { ImpactService } from './impact/services/impact_service';
import { createSetImpactTool } from './impact/tools/set_impact_tool';
import { registerInvestigationConversationEvents } from './investigations/conversation_events';
import type { InvestigationsPrivilegesChecker } from './investigations/services/check_investigations_privileges';
import { InvestigationStatusService } from './investigations/services/investigation_status_service';
import { registerInvestigationStepDefinitions } from './investigations/step_types';
import { createConversationReadCheck } from './investigation_attachments';
import { createUserResolver } from './services/resolve_user';
import type { ResolveUser } from './services/resolve_user';
import {
  createSubjectClaimStorageClient,
  SubjectClaimsService,
} from './subjects/services/subject_claims_service';
import { registerSubjectAttachment, subjectAttachment } from './subjects/attachments';
import { SubjectsService } from './subjects/services/subjects_service';
import { createThreadConversationResolver } from './subjects/services/thread_conversation_resolver';
import { registerWorkflowExecutionStepDefinitions } from './workflow_execution/step_types';

/**
 * What the `server` entry (Kibana) and the `server/tasks` entry (task pods) both build: the same
 * registrations and the same services, over the contracts each of them has.
 */

interface RegistrationDeps {
  agentBuilder: AgentBuilderPluginSetup;
  workflowsExtensions: Pick<WorkflowsExtensionsServerPluginSetup, 'registerStepDefinition'>;
  logger: Logger;
  escalationsEnabled: boolean;
  privileges: InvestigationsPrivilegesChecker;
  getImpactService: () => ImpactService;
  getSubjectsService: () => SubjectsService;
  getHypothesesService: () => HypothesesService;
  getInvestigationStatusService: () => InvestigationStatusService;
  resolveUser: ResolveUser;
  getAttachmentClient: (request: KibanaRequest) => Promise<AttachmentPublicClient>;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}

/**
 * The agent builder conversation events, attachment types, conversation resolver and tools, and the
 * workflow steps. They register during setup but only run once started, so the services are
 * resolved per call.
 */
export const registerInvestigationsContributions = ({
  agentBuilder,
  workflowsExtensions,
  logger,
  escalationsEnabled,
  privileges,
  getImpactService,
  getSubjectsService,
  getHypothesesService,
  getInvestigationStatusService,
  resolveUser,
  getAttachmentClient,
  getConversationClient,
}: RegistrationDeps) => {
  registerInvestigationConversationEvents(agentBuilder);
  if (escalationsEnabled) {
    registerEscalationConversationEvents(agentBuilder);
  }

  const assertCanReadConversation = createConversationReadCheck({ getConversationClient });

  registerImpactAttachment(agentBuilder, {
    getImpactService,
    privileges,
    assertCanReadConversation,
    logger,
  });
  registerSubjectAttachment(agentBuilder, {
    getSubjectsService,
    privileges,
    assertCanReadConversation,
    logger,
  });
  registerHypothesesAttachment(agentBuilder, {
    getHypothesesService,
    privileges,
    assertCanReadConversation,
    logger,
  });

  agentBuilder.callbacks.registerConversationResolver(
    createThreadConversationResolver({ getSubjectsService })
  );

  agentBuilder.tools.register(
    createSetImpactTool({ getImpactService, resolveUser, privileges, logger })
  );
  agentBuilder.tools.register(
    createSetHypothesesTool({ getHypothesesService, resolveUser, privileges, logger })
  );

  registerImpactStepDefinitions({
    workflowsExtensions,
    getImpactService,
    resolveUser,
    privileges,
    getAttachmentClient,
    getConversationClient,
  });

  registerInvestigationStepDefinitions({
    workflowsExtensions,
    getInvestigationStatusService,
    getConversationClient,
  });

  registerWorkflowExecutionStepDefinitions({ workflowsExtensions, getConversationClient });
};

export interface InvestigationsServices {
  resolveUser: ResolveUser;
  impactService: ImpactService;
  subjectsService: SubjectsService;
  hypothesesService: HypothesesService;
  investigationStatusService: InvestigationStatusService;
}

/** The services that exist from start, which the steps, tools and attachments use. */
export const createInvestigationsServices = ({
  core,
  esClient,
  logger,
  getConversationClient,
  getProposals,
  getSpaceId,
}: {
  core: Pick<CoreStart, 'userProfile' | 'security'>;
  esClient: ElasticsearchClient;
  logger: Logger;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  getProposals: () => ProposalsPluginStart | undefined;
  getSpaceId: (request: KibanaRequest) => string;
}): InvestigationsServices => {
  const resolveUser = createUserResolver({
    userProfile: core.userProfile,
    security: core.security,
    logger,
  });

  // Reads and writes go through the internal user; authorization is enforced
  // at the API layer.
  const impactService = new ImpactService({
    storage: createImpactStorageClient({ esClient, logger }),
  });
  const subjectsService = new SubjectsService({
    documents: subjectAttachment.createService({ esClient, logger }),
    claims: new SubjectClaimsService({
      storage: createSubjectClaimStorageClient({ esClient, logger }),
    }),
  });
  const hypothesesService = new HypothesesService({
    documents: hypothesesAttachment.createService({ esClient, logger }),
  });
  const investigationStatusService = new InvestigationStatusService({
    getConversationClient,
    getProposals,
    getSpaceId,
    logger,
  });

  return {
    resolveUser,
    impactService,
    subjectsService,
    hypothesesService,
    investigationStatusService,
  };
};
