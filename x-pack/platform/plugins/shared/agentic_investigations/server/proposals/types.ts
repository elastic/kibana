/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { ProposalsService } from './services/proposals_service';
import type { ResolveProposalUser } from './services/resolve_proposal_user';

export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
  getProposalsService: () => ProposalsService;
  getSpaceId: (request: KibanaRequest) => string;
  resolveUser: ResolveProposalUser;
}
