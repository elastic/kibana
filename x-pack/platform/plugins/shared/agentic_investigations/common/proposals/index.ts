/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { PROPOSAL_ATTACHMENT_TYPE, PROPOSAL_WITHOUT_ACTION } from './attachment';

export {
  PROPOSALS_INDEX_NAME,
  PROPOSALS_INTERNAL_URL,
  PROPOSALS_RESUME_CHANNEL,
  PROPOSALS_UI_CAPABILITY_DECIDE,
  PROPOSALS_UI_CAPABILITY_SHOW,
  PROPOSAL_APPROVE_URL,
  PROPOSAL_BY_ID_URL,
  PROPOSAL_DISMISS_URL,
} from './constants';

// The action-workflow contract is owned by @kbn/workflows, where the action
// YAML files live; re-exported here so consumers have one import site.
export { ACTION_WORKFLOW_TAG, actionMetadataSchema } from '@kbn/workflows';
export type { ActionMetadata } from '@kbn/workflows';

export {
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
} from './proposal';

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
  ProposalImpact,
  ProposalOrigin,
  ProposalStatus,
  ProposalWithMetadata,
} from './proposal';
