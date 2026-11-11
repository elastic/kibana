/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalAttachmentPayloadSchema } from '../../../common/types/domain/attachment/proposal/v2';
import type { UnifiedAttachmentTypeSetup } from '../types';
import { PROPOSAL_ATTACHMENT_TYPE } from '../../../common/constants/attachments';

export const proposalAttachmentType: UnifiedAttachmentTypeSetup = {
  id: PROPOSAL_ATTACHMENT_TYPE,
  schema: ProposalAttachmentPayloadSchema,
  // Not offered to workflow steps or the agent tool: they could attach any proposal id under a
  // title of their choosing, and nothing checks either against the proposal.
  workflowSchema: false,
};
