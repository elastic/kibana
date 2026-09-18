/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { PROPOSAL_ATTACHMENT_TYPE, PROPOSAL_WITHOUT_ACTION } from './attachment';

export {
  MAX_CHARTS_SUMMARY_BUCKETS,
  PROPOSALS_INDEX_NAME,
  PROPOSALS_INTERNAL_URL,
  PROPOSAL_UNCATEGORIZED,
  PROPOSALS_RESUME_CHANNEL,
  PROPOSALS_UI_CAPABILITY_DECIDE,
  PROPOSALS_UI_CAPABILITY_SHOW,
  PROPOSAL_APPROVE_URL,
  PROPOSAL_BY_ID_URL,
  PROPOSAL_DISMISS_URL,
  PROPOSAL_CHARTS_SUMMARY_URL,
} from './constants';

// The action-workflow contract is owned by @kbn/workflows, where the action
// YAML files live; re-exported here so consumers have one import site.
export { ACTION_WORKFLOW_TAG, actionMetadataSchema } from '@kbn/workflows';
export type { ActionMetadata } from '@kbn/workflows';

export {
  approveProposalRequestSchema,
  boundedActionInput,
  createProposalRequestSchema,
  dismissProposalRequestSchema,
  dismissReasonSchema,
  isAwaitingDecision,
  isExpired,
  listProposalsQuerySchema,
  MAX_PROPOSALS_SIZE,
  proposalFiltersSchema,
  proposalsQuerySchema,
  proposalCategorySchema,
  proposalConfidenceSchema,
  proposalDecisionSchema,
  proposalImpactSchema,
  proposalOriginSchema,
  proposalSchema,
  proposalChartsSummaryQuerySchema,
  proposalStatusSchema,
  proposalUserSchema,
} from './proposal';

export type {
  ApproveProposalRequest,
  CreateProposalRequest,
  DismissProposalRequest,
  DismissReason,
  ListByWindowQuery,
  ListProposalsQuery,
  ListProposalsResponse,
  Proposal,
  ProposalsQuery,
  ProposalsListResponse,
  ProposalCategory,
  ProposalConfidence,
  ProposalDecision,
  ProposalFilters,
  ProposalImpact,
  ProposalOrigin,
  ProposalChartsSummaryBucket,
  ProposalChartsSummaryQuery,
  ProposalChartsSummaryResponse,
  ProposalStatus,
  ProposalUser,
  ProposalWithMetadata,
} from './proposal';
