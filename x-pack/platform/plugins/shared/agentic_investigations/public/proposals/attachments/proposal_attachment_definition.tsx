/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ProposalAttachmentData, PROPOSAL_ATTACHMENT_TYPE } from '../../../common';
import { ProposalApprovalCard } from '../components/proposal_approval_card';

/** The attachment as stored in agent_builder conversations. */
export type ProposalAttachment = Attachment<
  typeof PROPOSAL_ATTACHMENT_TYPE,
  ProposalAttachmentData
>;

/**
 * Fixed, because `getLabel` is synchronous and the attachment carries only a
 * proposal id — there is nothing to title it by without a fetch. The action
 * name, impact and decision are rendered live by the card instead, which is
 * also why this type contributes no `getHeader` badges.
 */
const ATTACHMENT_LABEL = i18n.translate('xpack.agenticInvestigations.proposals.attachments.label', {
  defaultMessage: 'Investigation proposal',
});

/** Factory for the browser-side proposal attachment UI definition. */
export const createProposalAttachmentDefinition =
  (): AttachmentUIDefinition<ProposalAttachment> => ({
    getLabel: () => ATTACHMENT_LABEL,

    getIcon: () => 'lock',

    renderInlineContent: ({ attachment }) => (
      <ProposalApprovalCard proposalId={attachment.origin ?? attachment.data.proposalId} />
    ),
  });
