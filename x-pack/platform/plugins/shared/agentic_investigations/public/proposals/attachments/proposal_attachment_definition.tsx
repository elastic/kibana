/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { HttpSetup } from '@kbn/core-http-browser';
import { PROPOSAL_WITHOUT_ACTION, isDecided } from '../../../common';
import type { ProposalWithMetadata, PROPOSAL_ATTACHMENT_TYPE } from '../../../common';
import { ProposalApprovalCard } from '../components/proposal_approval_card';

/** The attachment as stored in agent_builder conversations. */
export type ProposalAttachment = Attachment<typeof PROPOSAL_ATTACHMENT_TYPE, ProposalWithMetadata>;

interface CreateProposalAttachmentDefinitionArgs {
  http: HttpSetup;
}

/** Badge color map for proposal impact values. */
const IMPACT_BADGE_COLORS: Record<string, string> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

/** Badge color map for decided statuses. */
const STATUS_BADGE_COLORS: Record<string, string> = {
  approved: 'success',
  executing: 'accent',
  succeeded: 'success',
  failed: 'danger',
  dismissed: 'default',
};

/**
 * Factory for the browser-side proposal attachment UI definition.
 *
 * `http` is captured at `start()` and closed over by the factory so renderers
 * can reach the API at any point after mount.
 *
 * The renderer runs inside Agent Builder's React tree. It manages its own
 * lightweight HTTP state rather than bridging into an external QueryClient.
 */
export const createProposalAttachmentDefinition = ({
  http,
}: CreateProposalAttachmentDefinitionArgs): AttachmentUIDefinition<ProposalAttachment> => ({
  getLabel: (attachment) =>
    attachment.data.action?.name ?? attachment.data.actionWorkflowId ?? PROPOSAL_WITHOUT_ACTION,

  getIcon: () => 'lock',

  getHeader: ({ attachment }) => {
    const { data } = attachment;
    const badges = [];

    // Status badge — suppressed for pending (the card footer shows the actions instead)
    if (data.expired) {
      badges.push({ label: 'Expired', color: 'danger' });
    } else if (isDecided(data.status)) {
      badges.push({
        label: data.status,
        color: STATUS_BADGE_COLORS[data.status] ?? 'default',
      });
    }

    // Impact badge
    badges.push({
      label: `${data.impact} impact`,
      color: IMPACT_BADGE_COLORS[data.impact] ?? 'default',
    });

    // Confidence badge
    badges.push({ label: data.confidence });

    return { badges };
  },

  renderInlineContent: (props) => {
    const proposalId = props.attachment.origin ?? props.attachment.id;
    // eslint-disable-next-line no-console
    console.log('[proposal_attachment] renderInlineContent', {
      id: props.attachment.id,
      origin: props.attachment.origin,
      proposalId,
      data: props.attachment.data,
    });
    return (
      <ProposalApprovalCard proposal={props.attachment.data} proposalId={proposalId} http={http} />
    );
  },
});
