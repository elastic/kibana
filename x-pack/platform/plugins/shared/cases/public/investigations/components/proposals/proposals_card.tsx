/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import type {
  InvestigationItem,
  InvestigationRecord,
  ProposalItem,
} from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { useItems } from '../../hooks';
import { ICONS } from '../../icons';
import { useEvidenceByIds } from '../claims/use_evidence_lookup';
import { OverviewCard } from '../overview/overview_card';
import { ConfirmModal } from '../shared/confirm_modal';
import { ErrorState } from '../shared/error_state';
import type { TabId } from '../tabs/tab_props';
import { ApproveModal } from './approve_modal';
import { ModifyModal } from './modify_modal';
import { ProposalRow } from './proposal_row';
import { ProposalWhyFlyout } from './proposal_why_flyout';
import { RejectModal } from './reject_modal';
import { CATEGORY_LABELS, sortProposals } from './proposal_utils';
import { useProposalActions } from './use_proposal_actions';
import * as i18n from './translations';

/** Proposals shown before the "Show N more" fold. */
const VISIBLE_PROPOSALS = 3;

type ProposalModal = {
  kind: 'approve' | 'reject' | 'modify' | 'reopen';
  proposalId: string;
} | null;

const isProposal = (item: InvestigationItem): item is ProposalItem => item.kind === 'proposal';

export interface ProposalsCardProps {
  record: InvestigationRecord;
  agentAvailable: boolean;
  onNavigateTab: (tab: TabId, opts?: { itemId?: string }) => void;
}

/** Actions agents propose, waiting for a person to approve, modify or reject them. */
export const ProposalsCard: React.FC<ProposalsCardProps> = ({
  record,
  agentAvailable,
  onNavigateTab,
}) => {
  const { data, isLoading, isError, error, refetch } = useItems(record.id, {
    kind: ['proposal'],
    per_page: INVESTIGATION_LIMITS.maxPerPage,
  });
  const { approve, reject, reopen, isUpdating } = useProposalActions(record.id);
  const [isExpanded, setIsExpanded] = useState(false);
  const [modal, setModal] = useState<ProposalModal>(null);
  const [whyId, setWhyId] = useState<string | null>(null);

  const proposals = useMemo(() => sortProposals((data?.items ?? []).filter(isProposal)), [data]);
  const evidenceIds = useMemo(
    () => proposals.flatMap(({ proposal }) => proposal.evidence_ids),
    [proposals]
  );
  const { byId: evidenceById } = useEvidenceByIds(record.id, evidenceIds);

  const pending = proposals.filter(({ status }) => status === 'pending').length;
  const canDecide = record.status !== 'closed';
  const visible = isExpanded ? proposals : proposals.slice(0, VISIBLE_PROPOSALS);
  const hidden = proposals.slice(VISIBLE_PROPOSALS);
  const hiddenCategories = Array.from(
    new Set(hidden.map(({ proposal }) => CATEGORY_LABELS[proposal.category]))
  );

  const findProposal = (id: string | undefined) => proposals.find((item) => item.id === id);
  const modalProposal = findProposal(modal?.proposalId);
  const whyProposal = findProposal(whyId ?? undefined);

  const closeModal = () => setModal(null);
  const openEvidence = (itemId: string) => onNavigateTab('evidence', { itemId });

  const requestApprove = async (proposal: ProposalItem) => {
    if (proposal.proposal.disruption === 'low') {
      await approve(proposal);
      return;
    }
    setModal({ kind: 'approve', proposalId: proposal.id });
  };

  const requestReject = (proposal: ProposalItem) =>
    setModal({ kind: 'reject', proposalId: proposal.id });
  const requestModify = (proposal: ProposalItem) =>
    setModal({ kind: 'modify', proposalId: proposal.id });
  const requestReopen = (proposal: ProposalItem) =>
    setModal({ kind: 'reopen', proposalId: proposal.id });

  return (
    <OverviewCard
      title={i18n.WAITING_ON_YOU}
      iconType={ICONS.user}
      tone={pending > 0 ? 'warning' : 'plain'}
      data-test-subj="investigationProposalsCard"
      action={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {pending > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning" data-test-subj="investigationProposalsPending">
                {i18n.PENDING_COUNT(pending)}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          {proposals.length > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.RESPONSE_ACTIONS_FIRST}
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      }
    >
      {isLoading ? <EuiLoadingSpinner size="l" /> : null}
      {isError ? (
        <ErrorState
          title={i18n.PROPOSALS_LOAD_ERROR}
          error={error}
          onRetry={() => void refetch()}
        />
      ) : null}
      {!isLoading && !isError && proposals.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="investigationProposalsEmpty">
          {record.ai_enabled ? i18n.EMPTY_WITH_AI : i18n.EMPTY_WITHOUT_AI}
        </EuiText>
      ) : null}
      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="investigationProposalsList">
        {visible.map((proposal) => (
          <EuiFlexItem key={proposal.id}>
            <ProposalRow
              proposal={proposal}
              evidenceById={evidenceById}
              canDecide={canDecide}
              onApprove={(item) => void requestApprove(item)}
              onReject={requestReject}
              onModify={requestModify}
              onReopen={requestReopen}
              onWhy={(item) => setWhyId(item.id)}
              onOpenEvidence={openEvidence}
            />
          </EuiFlexItem>
        ))}
        {hidden.length > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              flush="left"
              iconType={isExpanded ? ICONS.chevronUp : ICONS.chevronDown}
              iconSide="right"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              data-test-subj="investigationProposalsToggle"
            >
              {isExpanded
                ? i18n.SHOW_FEWER
                : i18n.SHOW_MORE(hidden.length, hiddenCategories.join(', '))}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>

      {modal?.kind === 'approve' && modalProposal ? (
        <ApproveModal
          proposal={modalProposal}
          evidenceById={evidenceById}
          isLoading={isUpdating}
          onCancel={closeModal}
          onOpenEvidence={openEvidence}
          onConfirm={() =>
            void approve(modalProposal).then((saved) => {
              if (saved) {
                closeModal();
              }
            })
          }
        />
      ) : null}
      {modal?.kind === 'reject' && modalProposal ? (
        <RejectModal
          proposal={modalProposal}
          isLoading={isUpdating}
          onCancel={closeModal}
          onConfirm={(reason, note) =>
            void reject(modalProposal, reason, note).then((saved) => {
              if (saved) {
                closeModal();
              }
            })
          }
        />
      ) : null}
      {modal?.kind === 'modify' && modalProposal ? (
        <ModifyModal
          record={record}
          proposal={modalProposal}
          agentAvailable={agentAvailable}
          onClose={closeModal}
          onApproveVersion={(item) => {
            closeModal();
            void requestApprove(findProposal(item.id) ?? item);
          }}
          onRejectVersion={(item) => requestReject(findProposal(item.id) ?? item)}
        />
      ) : null}
      {modal?.kind === 'reopen' && modalProposal ? (
        <ConfirmModal
          title={i18n.REOPEN_MODAL_TITLE}
          body={<EuiText size="s">{i18n.REOPEN_MODAL_BODY(modalProposal.title)}</EuiText>}
          confirmLabel={i18n.REOPEN}
          isLoading={isUpdating}
          onCancel={closeModal}
          onConfirm={() =>
            void reopen(modalProposal).then((saved) => {
              if (saved) {
                closeModal();
              }
            })
          }
          data-test-subj="investigationReopenProposalModal"
        />
      ) : null}
      {whyProposal ? (
        <ProposalWhyFlyout
          record={record}
          proposal={whyProposal}
          evidenceById={evidenceById}
          canDecide={canDecide}
          onClose={() => setWhyId(null)}
          onNavigateTab={onNavigateTab}
          onApprove={(item) => {
            setWhyId(null);
            void requestApprove(item);
          }}
          onReject={(item) => {
            setWhyId(null);
            requestReject(item);
          }}
          onModify={(item) => {
            setWhyId(null);
            requestModify(item);
          }}
        />
      ) : null}
    </OverviewCard>
  );
};
ProposalsCard.displayName = 'ProposalsCard';
