/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ApprovalModal, type ApprovalModalProps } from './approval_modal';
export {
  ApprovalContent,
  type ApprovalContentProps,
  type ApprovalAction,
  type AlwaysAllowOption,
} from './approval_content';
export { getProposalTone, isProposalExpired } from './proposal_helpers';
export { toActionImpactItems } from './to_action_impact_items';
export type { ApprovalProposal } from './types';
export { type ActionImpactContent, type ActionImpactSectionProps } from './action_impact_section';
