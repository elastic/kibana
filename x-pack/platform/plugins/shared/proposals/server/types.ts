/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { Proposal } from '@kbn/proposals-common';
import type { ProposalsService } from './services/proposals_service';
import type { ProposalCreator } from './services/create_proposal';
import type { ProposalPrivilegesChecker } from './services/check_proposal_privileges';
import type { ResolveProposalUser } from './services/resolve_proposal_user';

export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
  getProposalsService: () => ProposalsService;
  getSpaceId: (request: KibanaRequest) => string;
  resolveUser: ResolveProposalUser;
}

export interface ProposalsSetupDependencies {
  features: FeaturesPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
  /** Registers the proposal attachment type and the `proposals.create` agent tool. */
  agentBuilder: AgentBuilderPluginSetup;
}

export interface ProposalsStartDependencies {
  /**
   * Needed to authorize a principal that did not arrive through a route — a
   * workflow execution deciding or writing a proposal. Optional because Kibana
   * can run without it; the privilege checks fail closed when it is absent.
   */
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  /** Writes the conversation attachment that surfaces a new proposal in the chat. */
  agentBuilder: AgentBuilderPluginStart;
}

/**
 * Exposed so a solution plugin can reach a proposal in-process rather than over
 * HTTP (Core's self client refuses a self call that is already one).
 */
export interface ProposalsPluginStart {
  getProposalsService: () => ProposalsService;
  /** For in-process callers (Agent Builder tools) that bypass the route's `security.authz`. */
  getProposalPrivileges: () => ProposalPrivilegesChecker;
  /**
   * Proposes an action in a conversation as the user behind the request, for callers that propose
   * without an agent run (for example a hook). Checks the user's proposal privilege. The `origin`
   * routes the proposal to that feature's queue, so a caller passes its own and never another
   * feature's.
   */
  createProposal: ProposalCreator;
}

/**
 * Lets a plugin tie new proposals to a record it owns (the Cases bridge ties them to the case the
 * conversation is linked to), without this plugin depending on that plugin.
 */
export interface ProposalCreateExtension {
  /** Before the proposal is stored: the case to record on it, if any. Errors are logged, not thrown. */
  resolveCaseId: (args: {
    request: KibanaRequest;
    conversationId: string;
    spaceId: string;
  }) => Promise<string | undefined>;
  /** After the proposal is stored and attached to its conversation. Errors are logged, not thrown. */
  onCreated: (args: {
    request: KibanaRequest;
    proposal: Proposal;
    spaceId: string;
  }) => Promise<void>;
}

export interface ProposalsPluginSetup {
  /** One extension only; a second registration throws. */
  registerCreateExtension: (extension: ProposalCreateExtension) => void;
}
