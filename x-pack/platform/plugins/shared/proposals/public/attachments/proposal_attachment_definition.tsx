/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ProposalAttachmentData, PROPOSAL_ATTACHMENT_TYPE } from '@kbn/proposals-common';
import { ProposalApprovalCard } from '../components/proposal_approval_card';

/** The attachment as stored in agent_builder conversations. */
export type ProposalAttachment = Attachment<
  typeof PROPOSAL_ATTACHMENT_TYPE,
  ProposalAttachmentData
>;

/** Factory for the browser-side proposal attachment UI definition. */
export const createProposalAttachmentDefinition =
  (): AttachmentUIDefinition<ProposalAttachment> => ({
    // Synchronous, so it can only title a card from what the attachment
    // stores; impact, status and decision are rendered live by the card.
    getLabel: ({ data }) => data.title,

    getIcon: () => 'lock',

    renderInlineContent: ({ attachment }) => (
      <ProposalApprovalCard proposalId={attachment.origin ?? attachment.data.proposalId} />
    ),
  });
