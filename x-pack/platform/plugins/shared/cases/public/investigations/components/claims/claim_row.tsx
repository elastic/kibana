/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ClaimItem, EvidenceItem } from '../../../../common/investigations/types';
import { CLAIM_STATUS_ICONS, ICONS } from '../../icons';
import { ActorAvatar } from '../shared/actor_badge';
import {
  CLAIM_STATUS_COLORS,
  CLAIM_STATUS_LABELS,
  getClaimStatusLine,
  getClaimTitle,
  getClaimWhyStrength,
} from './claim_utils';
import { EvidenceCites } from './evidence_cites';
import { WhyButton } from './why_button';
import * as i18n from './translations';

export interface ClaimRowProps {
  claim: ClaimItem;
  /** Evidence of the card by id, to show the refs of the linked evidence. */
  evidenceById: ReadonlyMap<string, EvidenceItem>;
  onOpen: (claimId: string) => void;
  onWhy: (claim: ClaimItem) => void;
  onOpenEvidence: (itemId: string) => void;
}

const STATUS_ICON_COLORS = {
  open: 'primary',
  supported: 'success',
  blocked: 'danger',
  refuted: 'subdued',
} as const;

/** One claim of the Claims card. Clicking it opens the claim flyout. */
export const ClaimRow: React.FC<ClaimRowProps> = ({
  claim,
  evidenceById,
  onOpen,
  onWhy,
  onOpenEvidence,
}) => {
  const { euiTheme } = useEuiTheme();
  const { status, claim: details } = claim;
  const statusLine = getClaimStatusLine(claim);
  const linkedEvidence = details.supporting_evidence_ids
    .map((id) => evidenceById.get(id))
    .filter((item): item is EvidenceItem => item !== undefined);
  const refs = linkedEvidence.map(({ ref }) => ref);
  const byRef = new Map(linkedEvidence.map((item) => [item.ref, item]));
  const { strength, evidenceCount } = getClaimWhyStrength(claim);
  const changedByOther = claim.updated_by.id !== claim.created_by.id;
  const settled = status === 'supported' || status === 'refuted';

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      css={css`
        position: relative;
        &:hover {
          background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
      `}
      data-test-subj={`investigationClaimRow-${claim.ref}`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={CLAIM_STATUS_ICONS[status]}
            color={STATUS_ICON_COLORS[status]}
            title={CLAIM_STATUS_LABELS[status]}
          />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          <EuiText size="s">
            <EuiLink
              color="text"
              onClick={() => onOpen(claim.id)}
              aria-label={i18n.OPEN_CLAIM_ARIA(claim.ref)}
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
                text-align: start;
                &::after {
                  content: '';
                  position: absolute;
                  inset: 0;
                }
              `}
              data-test-subj="investigationClaimRowTitle"
            >
              {getClaimTitle(claim)}
            </EuiLink>
          </EuiText>
          {statusLine ? (
            <EuiText size="xs" color="subdued">
              {statusLine}
            </EuiText>
          ) : null}
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            wrap
            css={css`
              position: relative;
              margin-block-start: ${euiTheme.size.xs};
              pointer-events: none;
              > * {
                pointer-events: auto;
              }
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiBadge color={CLAIM_STATUS_COLORS[status]}>{CLAIM_STATUS_LABELS[status]}</EuiBadge>
            </EuiFlexItem>
            {status === 'supported' && details.supporting_evidence_ids.length === 0 ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">{i18n.NEEDS_EVIDENCE}</EuiBadge>
              </EuiFlexItem>
            ) : null}
            {settled && details.confidence ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{`${details.confidence}%`}</EuiBadge>
              </EuiFlexItem>
            ) : null}
            {details.needs_review ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning" iconType={ICONS.reviewNeeded}>
                  {i18n.NEEDS_YOUR_REVIEW}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {details.stale_reason ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning" iconType={ICONS.stale}>
                  {i18n.NEW_EVIDENCE_SINCE_CONCLUDED}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            {details.source_message ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" iconType={ICONS.conversation}>
                  {i18n.FROM_MESSAGE}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              {refs.length > 0 ? (
                <EvidenceCites refs={refs} byRef={byRef} onOpenEvidence={onOpenEvidence} />
              ) : (
                <EuiText size="xs" color="subdued">
                  {details.supporting_evidence_ids.length > 0
                    ? i18n.EVIDENCE_COUNT(details.supporting_evidence_ids.length)
                    : i18n.NO_EVIDENCE_LINKED_SHORT}
                </EuiText>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <ActorAvatar actor={claim.created_by} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.RAISED_BY_NAME(claim.created_by.name)}
                    {changedByOther ? ` · ${i18n.LAST_CHANGED_BY(claim.updated_by.name)}` : ''}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <WhyButton
                strength={strength}
                evidenceCount={evidenceCount}
                subject={i18n.SUBJECT_CLAIM}
                onClick={() => onWhy(claim)}
                data-test-subj="investigationClaimRowWhy"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type={ICONS.chevronRight} color="subdued" aria-hidden="true" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
ClaimRow.displayName = 'ClaimRow';
