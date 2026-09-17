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
import { isDecided } from '../../../common';
import { PROPOSAL_WITHOUT_ACTION_LABEL } from '../translations';
import type {
  ProposalWithMetadata,
  PROPOSAL_ATTACHMENT_TYPE,
  ProposalStatus,
  ProposalImpact,
} from '../../../common';
import { ProposalApprovalCard } from '../components/proposal_approval_card';

/** The attachment as stored in agent_builder conversations. */
export type ProposalAttachment = Attachment<typeof PROPOSAL_ATTACHMENT_TYPE, ProposalWithMetadata>;

/** Badge color map for proposal impact values. */
const IMPACT_BADGE_COLORS: Record<ProposalImpact, string> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

/** Translated labels for decided statuses. */
const STATUS_BADGE_LABELS: Record<ProposalStatus, string> = {
  approved: i18n.translate(
    'xpack.agenticInvestigations.proposals.attachments.statusBadge.approved',
    { defaultMessage: 'Approved' }
  ),
  pending: i18n.translate('xpack.agenticInvestigations.proposals.attachments.statusBadge.pending', {
    defaultMessage: 'Pending',
  }),
  executing: i18n.translate(
    'xpack.agenticInvestigations.proposals.attachments.statusBadge.executing',
    { defaultMessage: 'Executing' }
  ),
  succeeded: i18n.translate(
    'xpack.agenticInvestigations.proposals.attachments.statusBadge.succeeded',
    { defaultMessage: 'Succeeded' }
  ),
  failed: i18n.translate('xpack.agenticInvestigations.proposals.attachments.statusBadge.failed', {
    defaultMessage: 'Failed',
  }),
  dismissed: i18n.translate(
    'xpack.agenticInvestigations.proposals.attachments.statusBadge.dismissed',
    { defaultMessage: 'Dismissed' }
  ),
};

/** Badge color map for decided statuses. */
const STATUS_BADGE_COLORS: Record<ProposalStatus, string> = {
  approved: 'success',
  pending: 'default',
  executing: 'accent',
  succeeded: 'success',
  failed: 'danger',
  dismissed: 'default',
};

/** Factory for the browser-side proposal attachment UI definition. */
export const createProposalAttachmentDefinition =
  (): AttachmentUIDefinition<ProposalAttachment> => ({
    getLabel: (attachment) =>
      attachment.data.action?.name ??
      attachment.data.actionWorkflowId ??
      PROPOSAL_WITHOUT_ACTION_LABEL,

    getIcon: () => 'lock',

    getHeader: ({ attachment }) => {
      const { data } = attachment;
      const badges = [];

      // Status badge — suppressed for pending (the card footer shows the actions instead)
      if (data.expired) {
        badges.push({
          label: i18n.translate(
            'xpack.agenticInvestigations.proposals.attachments.expiredBadgeLabel',
            { defaultMessage: 'Expired' }
          ),
          color: 'danger',
        });
      } else if (isDecided(data.status)) {
        badges.push({
          label: STATUS_BADGE_LABELS[data.status] ?? data.status,
          color: STATUS_BADGE_COLORS[data.status] ?? 'default',
        });
      }

      // Impact badge
      badges.push({
        label: i18n.translate(
          'xpack.agenticInvestigations.proposals.attachments.impactBadgeLabel',
          {
            defaultMessage: '{impact} impact',
            values: { impact: data.impact },
          }
        ),
        color: IMPACT_BADGE_COLORS[data.impact] ?? 'default',
      });

      // Confidence badge
      badges.push({ label: data.confidence });

      return { badges };
    },

    renderInlineContent: (props) => {
      const proposalId = props.attachment.origin ?? props.attachment.id;
      return <ProposalApprovalCard proposalId={proposalId} />;
    },
  });
