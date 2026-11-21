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
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ClaimItem } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { ActorBadge } from '../shared/actor_badge';
import { RelativeTime } from '../shared/relative_time';
import {
  CLAIM_STATUS_COLORS,
  CLAIM_STATUS_LABELS,
  STRENGTH_COLORS,
  STRENGTH_LABELS,
  getClaimTitle,
  getClaimWhyStrength,
} from './claim_utils';
import { WhyButton } from './why_button';
import * as i18n from './translations';

export interface ClaimFlyoutHeaderProps {
  claim: ClaimItem;
  titleId: string;
  onWhy: () => void;
}

/** Ref, status, review and strength badges, the title, who raised it and the Why button. */
export const ClaimFlyoutHeader: React.FC<ClaimFlyoutHeaderProps> = ({ claim, titleId, onWhy }) => {
  const { claim: details, status, ref } = claim;
  const { strength, evidenceCount } = getClaimWhyStrength(claim);

  return (
    <EuiFlyoutHeader hasBorder>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="investigationClaimRef">
            {ref}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={CLAIM_STATUS_COLORS[status]} data-test-subj="investigationClaimStatus">
            {CLAIM_STATUS_LABELS[status]}
          </EuiBadge>
        </EuiFlexItem>
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
        <EuiFlexItem grow={false}>
          <EuiBadge color={STRENGTH_COLORS[strength]} data-test-subj="investigationClaimStrength">
            {STRENGTH_LABELS[strength]}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiTitle size="s">
        <h2 id={titleId} data-test-subj="investigationClaimTitle">
          {getClaimTitle(claim)}
        </h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <ActorBadge actor={claim.created_by} compact />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.RAISED_AT} <RelativeTime value={claim.created_at} />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <WhyButton
            strength={strength}
            evidenceCount={evidenceCount}
            subject={i18n.SUBJECT_CLAIM}
            onClick={onWhy}
            data-test-subj="investigationClaimWhy"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutHeader>
  );
};
ClaimFlyoutHeader.displayName = 'ClaimFlyoutHeader';
