/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ProposalsService } from './services/proposals_service';

export interface ConversationProposalsSetupDependencies {
  features: FeaturesPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
}

export interface ConversationProposalsStartDependencies {
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

/**
 * Exposed so a solution plugin can reach proposals in-process rather than over
 * HTTP (Core's self client refuses a self call that is already one).
 */
export interface ConversationProposalsPluginStart {
  getProposalsService: () => ProposalsService;
}

export type ConversationProposalsPluginSetup = Record<string, never>;

export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
  getProposalsService: () => ProposalsService;
  getSpaceId: (request: KibanaRequest) => string;
  getUsername: (request: KibanaRequest) => Promise<string | undefined>;
}
