/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  EvidenceItem,
  InvestigationRecord,
  ProposalItem,
} from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { ArgumentFlyout } from '../claims/argument_flyout';
import type { TabId } from '../tabs/tab_props';
import { buildProposalArgument } from './proposal_utils';
import * as i18n from './translations';

export interface ProposalWhyFlyoutProps {
  record: InvestigationRecord;
  proposal: ProposalItem;
  evidenceById: ReadonlyMap<string, EvidenceItem>;
  canDecide: boolean;
  onClose: () => void;
  onNavigateTab: (tab: TabId, opts?: { itemId?: string }) => void;
  onApprove: (proposal: ProposalItem) => void;
  onReject: (proposal: ProposalItem) => void;
  onModify: (proposal: ProposalItem) => void;
}

/** The argument behind a proposal, with the decision buttons in the footer. */
export const ProposalWhyFlyout: React.FC<ProposalWhyFlyoutProps> = ({
  record,
  proposal,
  evidenceById,
  canDecide,
  onClose,
  onNavigateTab,
  onApprove,
  onReject,
  onModify,
}) => {
  const stored = proposal.proposal.argument ?? null;
  const argument = useMemo(
    () => stored ?? buildProposalArgument(proposal, evidenceById),
    [stored, proposal, evidenceById]
  );
  const decision = proposal.proposal.decision;

  const footer =
    proposal.status === 'pending' ? (
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            isDisabled={!canDecide}
            onClick={() => onModify(proposal)}
            data-test-subj="investigationProposalFlyoutModify"
          >
            {i18n.MODIFY}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="danger"
            isDisabled={!canDecide}
            onClick={() => onReject(proposal)}
            data-test-subj="investigationProposalFlyoutReject"
          >
            {i18n.REJECT}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            isDisabled={!canDecide}
            onClick={() => onApprove(proposal)}
            data-test-subj="investigationProposalFlyoutApprove"
          >
            {i18n.APPROVE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : proposal.status === 'approved' ? (
      <EuiBadge color="success" iconType={ICONS.check}>
        {decision ? i18n.APPROVED_BY(decision.by.name) : i18n.APPROVED}
      </EuiBadge>
    ) : proposal.status === 'rejected' ? (
      <EuiBadge color="hollow">
        {decision ? i18n.REJECTED_BY(decision.by.name) : i18n.REJECTED}
      </EuiBadge>
    ) : (
      <EuiBadge color="hollow">{i18n.WITHDRAWN}</EuiBadge>
    );

  return (
    <ArgumentFlyout
      record={record}
      argument={argument}
      title={i18n.PROPOSAL_REF(proposal.ref)}
      onClose={onClose}
      onNavigateTab={onNavigateTab}
      footer={footer}
    />
  );
};
ProposalWhyFlyout.displayName = 'ProposalWhyFlyout';
