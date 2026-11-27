/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { EvidenceItem, ProposalItem } from '../../../../common/investigations/types';
import { ICONS, PROPOSAL_CATEGORY_ICONS } from '../../icons';
import { countArgumentEvidence, normalizeArgument } from '../claims/claim_utils';
import { EvidenceCites } from '../claims/evidence_cites';
import { WhyButton } from '../claims/why_button';
import { ActorBadge } from '../shared/actor_badge';
import { RelativeTime } from '../shared/relative_time';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './proposal_utils';
import * as i18n from './translations';
import * as claimsI18n from '../claims/translations';

export interface ProposalRowProps {
  proposal: ProposalItem;
  evidenceById: ReadonlyMap<string, EvidenceItem>;
  /** False when the record is closed: decisions are read only. */
  canDecide: boolean;
  onApprove: (proposal: ProposalItem) => void;
  onReject: (proposal: ProposalItem) => void;
  onModify: (proposal: ProposalItem) => void;
  onReopen: (proposal: ProposalItem) => void;
  onWhy: (proposal: ProposalItem) => void;
  onOpenEvidence: (itemId: string) => void;
}

const DisruptionBadge: React.FC<{ disruption: ProposalItem['proposal']['disruption'] }> = ({
  disruption,
}) => {
  if (disruption === 'high') {
    return (
      <EuiBadge
        color="danger"
        iconType={ICONS.disruptive}
        data-test-subj="investigationDisruptionBadge"
      >
        {i18n.DISRUPTIVE}
      </EuiBadge>
    );
  }
  if (disruption === 'medium') {
    return (
      <EuiBadge color="warning" data-test-subj="investigationDisruptionBadge">
        {i18n.WIDE_IMPACT}
      </EuiBadge>
    );
  }
  return null;
};
DisruptionBadge.displayName = 'DisruptionBadge';

/** One proposed action with its decision controls or its decision state. */
export const ProposalRow: React.FC<ProposalRowProps> = ({
  proposal,
  evidenceById,
  canDecide,
  onApprove,
  onReject,
  onModify,
  onReopen,
  onWhy,
  onOpenEvidence,
}) => {
  const { euiTheme } = useEuiTheme();
  const { status, proposal: details } = proposal;
  const decision = details.decision;
  const linked = details.evidence_ids
    .map((id) => evidenceById.get(id))
    .filter((item): item is EvidenceItem => item !== undefined);
  const byRef = new Map(linked.map((item) => [item.ref, item]));
  const stored = details.argument ? normalizeArgument(details.argument) : null;
  const strength = stored?.strength ?? 'Moderate';
  const evidenceCount = stored ? countArgumentEvidence(stored) : details.evidence_ids.length;
  const isDone = status !== 'pending';

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      color={isDone ? 'subdued' : 'plain'}
      data-test-subj={`investigationProposal-${proposal.ref}`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge
            color={CATEGORY_COLORS[details.category]}
            iconType={PROPOSAL_CATEGORY_ICONS[details.category]}
            data-test-subj="investigationProposalCategory"
          >
            {CATEGORY_LABELS[details.category]}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DisruptionBadge disruption={details.disruption} />
        </EuiFlexItem>
        <EuiFlexItem grow />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <ActorBadge actor={proposal.created_by} compact />
            </EuiFlexItem>
            {details.revision > 1 ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" data-test-subj="investigationProposalRevision">
                  {i18n.REVISED_VERSION(details.revision)}
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText
        size="s"
        css={css`
          margin-block-start: ${euiTheme.size.xs};
        `}
      >
        <strong data-test-subj="investigationProposalTitle">{proposal.title}</strong>
      </EuiText>
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="flexStart"
        responsive={false}
        css={css`
          margin-block-start: ${euiTheme.size.xs};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon type={ICONS.info} size="s" color="subdued" aria-hidden="true" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued" data-test-subj="investigationProposalEffect">
            {details.effect}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {linked.length > 0 ? (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          css={css`
            margin-block-start: ${euiTheme.size.xs};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.EVIDENCE_LABEL}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EvidenceCites
              refs={linked.map(({ ref }) => ref)}
              byRef={byRef}
              onOpenEvidence={onOpenEvidence}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      <div
        css={css`
          margin-block-start: ${euiTheme.size.xs};
        `}
      >
        <WhyButton
          strength={strength}
          evidenceCount={evidenceCount}
          subject={claimsI18n.SUBJECT_PROPOSAL}
          onClick={() => onWhy(proposal)}
          data-test-subj="investigationProposalWhy"
        />
      </div>
      {status === 'rejected' ? (
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            margin-block-start: ${euiTheme.size.xs};
          `}
          data-test-subj="investigationProposalReason"
        >
          {i18n.REASON_LINE(decision?.reason ?? i18n.NO_REASON_GIVEN)}
          {decision?.note ? `. ${decision.note}` : ''}
        </EuiText>
      ) : null}
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        wrap
        css={css`
          margin-block-start: ${euiTheme.size.s};
        `}
      >
        {status === 'pending' ? (
          <>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                isDisabled={!canDecide}
                onClick={() => onApprove(proposal)}
                data-test-subj="investigationProposalApprove"
              >
                {i18n.APPROVE}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                isDisabled={!canDecide}
                onClick={() => onModify(proposal)}
                data-test-subj="investigationProposalModify"
              >
                {i18n.MODIFY}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="danger"
                isDisabled={!canDecide}
                onClick={() => onReject(proposal)}
                data-test-subj="investigationProposalReject"
              >
                {i18n.REJECT}
              </EuiButton>
            </EuiFlexItem>
          </>
        ) : null}
        {status === 'approved' ? (
          <EuiFlexItem grow={false}>
            <EuiBadge
              color="success"
              iconType={ICONS.check}
              data-test-subj="investigationProposalApproved"
            >
              {decision ? i18n.APPROVED_BY(decision.by.name) : i18n.APPROVED}
            </EuiBadge>
            {decision ? (
              <EuiText size="xs" color="subdued" component="span">
                {' '}
                <RelativeTime value={decision.at} />
              </EuiText>
            ) : null}
          </EuiFlexItem>
        ) : null}
        {status === 'rejected' ? (
          <>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="investigationProposalRejected">
                {decision ? i18n.REJECTED_BY(decision.by.name) : i18n.REJECTED}
              </EuiBadge>
              {decision ? (
                <EuiText size="xs" color="subdued" component="span">
                  {' '}
                  <RelativeTime value={decision.at} />
                </EuiText>
              ) : null}
            </EuiFlexItem>
            {canDecide ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType={ICONS.refresh}
                  onClick={() => onReopen(proposal)}
                  data-test-subj="investigationProposalReopen"
                >
                  {i18n.REOPEN}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
          </>
        ) : null}
        {status === 'withdrawn' ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="investigationProposalWithdrawn">
              {i18n.WITHDRAWN}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
ProposalRow.displayName = 'ProposalRow';
