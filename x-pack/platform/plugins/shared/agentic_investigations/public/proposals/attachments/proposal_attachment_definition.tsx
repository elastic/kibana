/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition, HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { isAwaitingDecision } from '../../../common';
import { PROPOSAL_WITHOUT_ACTION_LABEL } from '../translations';
import type {
  ProposalWithMetadata,
  PROPOSAL_ATTACHMENT_TYPE,
  ProposalDecision,
  ProposalImpact,
  ProposalStatus,
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

/** Translated labels for how far a proposal got. */
const STATUS_BADGE_LABELS: Record<ProposalStatus, string> = {
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
  expired: i18n.translate('xpack.agenticInvestigations.proposals.attachments.statusBadge.expired', {
    defaultMessage: 'Expired',
  }),
  // `no_action` describes the absence of an outcome, so the decision is what
  // the badge reports instead — see DECISION_BADGE_LABELS.
  no_action: '',
};

/** Badge color map for how far a proposal got. */
const STATUS_BADGE_COLORS: Record<ProposalStatus, string> = {
  pending: 'default',
  executing: 'accent',
  succeeded: 'success',
  failed: 'danger',
  expired: 'danger',
  no_action: 'default',
};

/** Translated labels for what an analyst concluded. */
const DECISION_BADGE_LABELS: Record<ProposalDecision, string> = {
  approved: i18n.translate(
    'xpack.agenticInvestigations.proposals.attachments.statusBadge.approved',
    { defaultMessage: 'Approved' }
  ),
  dismissed: i18n.translate(
    'xpack.agenticInvestigations.proposals.attachments.statusBadge.dismissed',
    { defaultMessage: 'Dismissed' }
  ),
};

const DECISION_BADGE_COLORS: Record<ProposalDecision, string> = {
  approved: 'success',
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
      const badges: HeaderBadge[] = [];

      // Status badge — suppressed while awaiting a decision (the card footer
      // shows the actions instead). `data.expired` is the computed flag for a
      // deadline that has passed; `status: 'expired'` is the durable
      // settlement, and the workflow can write it before the deadline when no
      // decision was reached, so both have to be checked.
      if (data.expired || data.status === 'expired') {
        badges.push({
          label: i18n.translate(
            'xpack.agenticInvestigations.proposals.attachments.expiredBadgeLabel',
            { defaultMessage: 'Expired' }
          ),
          color: 'danger',
        });
      } else if (!isAwaitingDecision(data)) {
        // Which axis to report depends on whether anything ran: `no_action`
        // means nothing did, so the analyst's decision is the whole story,
        // while the execution states describe what an approval went on to do.
        const decision = data.status === 'no_action' ? data.decision : undefined;
        badges.push({
          label: decision
            ? DECISION_BADGE_LABELS[decision]
            : (STATUS_BADGE_LABELS[data.status] ?? data.status),
          color: decision
            ? DECISION_BADGE_COLORS[decision]
            : (STATUS_BADGE_COLORS[data.status] ?? 'default'),
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
        color: IMPACT_BADGE_COLORS[data.impact],
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
