/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../types';
import { registerApproveProposalRoute } from './approve_proposal';
import { registerDismissProposalRoute } from './dismiss_proposal';
import { registerGetProposalRoute } from './get_proposal';
import { registerListProposalsRoute } from './list_proposals';
import { registerProposalStatsRoute } from './proposal_charts_summary';
import { registerReviseProposalRoute } from './revise_proposal';

// No create route: a proposal's decision is written behind its gate, so one
// without a gate execution could never be decided. The gate workflow's
// `proposals.createProposal` step is the only way to make one, and it is the
// only caller that knows the execution id to stamp.
export const registerRoutes = (deps: RouteDependencies) => {
  registerListProposalsRoute(deps);
  registerGetProposalRoute(deps);
  registerApproveProposalRoute(deps);
  registerDismissProposalRoute(deps);
  registerProposalStatsRoute(deps);
  registerReviseProposalRoute(deps);
};
