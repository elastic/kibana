/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  AGENTIC_INVESTIGATIONS_INTERNAL_URL,
  AGENTIC_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER_ID,
  AGENTIC_INVESTIGATIONS_PLUGIN_ID,
} from './constants';

// Each entity this plugin owns keeps its own barrel; the umbrella re-exports
// them so consumers have a single entry point per the plugin's public surface.
export {
  ACTION_WORKFLOW_TAG,
  PROPOSAL_ATTACHMENT_TYPE,
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
  actionMetadataSchema,
  approveProposalRequestSchema,
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
} from './proposals';

export type {
  ActionMetadata,
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
} from './proposals';

export {
  ESCALATION_BY_ID_URL,
  ESCALATION_LINKED_INVESTIGATIONS_FIELD,
  ESCALATION_TEMPLATE_ID,
  ESCALATIONS_INTERNAL_URL,
  ESCALATIONS_UI_CAPABILITY_MANAGE,
  INVESTIGATION_TEMPLATE_ID,
  MAX_ESCALATION_LINKED_INVESTIGATIONS,
  createEscalationRequestSchema,
  escalationVisibilitySchema,
  updateEscalationRequestSchema,
} from './escalations';

export type {
  CreateEscalationRequest,
  EscalationConversation,
  EscalationVisibility,
  UpdateEscalationRequest,
} from './escalations';
