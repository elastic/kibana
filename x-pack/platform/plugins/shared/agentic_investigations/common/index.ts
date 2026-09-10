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
  PROPOSALS_INDEX_NAME,
  PROPOSALS_INTERNAL_URL,
  PROPOSALS_RESUME_CHANNEL,
  PROPOSALS_UI_CAPABILITY_DECIDE,
  PROPOSALS_UI_CAPABILITY_SHOW,
  PROPOSAL_APPROVE_URL,
  PROPOSAL_BY_ID_URL,
  PROPOSAL_DISMISS_URL,
  approveProposalRequestSchema,
  createProposalRequestSchema,
  dismissProposalRequestSchema,
  dismissReasonSchema,
  isDecided,
  isExpired,
  listProposalsQuerySchema,
  proposalCategorySchema,
  proposalConfidenceSchema,
  proposalImpactSchema,
  proposalOriginSchema,
  proposalSchema,
  proposalStatusSchema,
  actionMetadataSchema,
} from './proposals';

export type {
  ActionMetadata,
  ApproveProposalRequest,
  CreateProposalRequest,
  DismissProposalRequest,
  DismissReason,
  ListProposalsQuery,
  ListProposalsResponse,
  Proposal,
  ProposalCategory,
  ProposalConfidence,
  ProposalImpact,
  ProposalOrigin,
  ProposalStatus,
  ProposalWithMetadata,
} from './proposals';
