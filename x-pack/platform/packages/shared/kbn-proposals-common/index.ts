/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { PROPOSAL_ATTACHMENT_TYPE, proposalAttachmentDataSchema } from './src/attachment';
export type { ProposalAttachmentData } from './src/attachment';

export {
  MAX_CHARTS_SUMMARY_BUCKETS,
  PROPOSALS_API_VERSION,
  PROPOSALS_INDEX_NAME,
  PROPOSALS_INTERNAL_URL,
  PROPOSAL_SETTLING_POLL_INTERVAL_MS,
  PROPOSAL_UNCATEGORIZED,
  PROPOSALS_RESUME_CHANNEL,
  PROPOSALS_UI_CAPABILITY_DECIDE,
  PROPOSALS_UI_CAPABILITY_SHOW,
  PROPOSAL_APPROVE_URL,
  PROPOSAL_BY_ID_URL,
  PROPOSAL_DISMISS_URL,
  PROPOSAL_REVISIONS_URL,
  PROPOSAL_CHARTS_SUMMARY_URL,
} from './src/constants';

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
  isProposalSettling,
  listProposalsQuerySchema,
  MAX_PROPOSALS_PAGE_OFFSET,
  MAX_PROPOSALS_PAGE_SIZE,
  proposalFiltersSchema,
  proposalCategorySchema,
  proposalConfidenceSchema,
  proposalDecisionSchema,
  proposalImpactSchema,
  proposalOriginSchema,
  proposalSchema,
  proposalChartsSummaryQuerySchema,
  proposalStatusSchema,
  proposalUserSchema,
} from './src/proposal';

export type {
  ApproveProposalRequest,
  CreateProposalRequest,
  DismissProposalRequest,
  DismissReason,
  ListProposalsQuery,
  ListProposalsResponse,
  Proposal,
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
} from './src/proposal';

export { reviseProposalRequestSchema, reviseProposalResponseSchema } from './src/revision';

export type { ReviseProposalRequest, ReviseProposalResponse } from './src/revision';

// Step schemas and ids, shared by the server handlers and the browser
// definitions that surface each step in the YAML editor.
export {
  CheckDecidePrivilegesStepId,
  checkDecidePrivilegesStepCommonDefinition,
  checkDecidePrivilegesStepInputSchema,
  checkDecidePrivilegesStepOutputSchema,
  isExternalResumePrincipal,
  CloneProposalStepId,
  cloneProposalStepCommonDefinition,
  cloneProposalStepInputSchema,
  cloneProposalStepOutputSchema,
  CreateProposalStepId,
  createProposalStepCommonDefinition,
  createProposalStepInputSchema,
  createProposalStepOutputSchema,
  GetLatestRevisionStepId,
  getLatestRevisionStepCommonDefinition,
  getLatestRevisionStepInputSchema,
  getLatestRevisionStepOutputSchema,
  GetProposalStepId,
  getProposalStepCommonDefinition,
  getProposalStepInputSchema,
  getProposalStepOutputSchema,
  SettleIncompleteProposalStepId,
  settleIncompleteProposalStepCommonDefinition,
  settleIncompleteProposalStepInputSchema,
  settleIncompleteProposalStepOutputSchema,
  settleIncompleteProposalStatusSchema,
  UpdateProposalStepId,
  updateProposalStepCommonDefinition,
  updateProposalStepInputSchema,
  updateProposalStepOutputSchema,
} from './src/step_types';
