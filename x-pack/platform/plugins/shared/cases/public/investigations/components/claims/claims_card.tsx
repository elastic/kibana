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
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  ClaimItem,
  ClaimStatus,
  InvestigationItem,
  InvestigationRecord,
} from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { useItems } from '../../hooks';
import { ICONS } from '../../icons';
import { ErrorState } from '../shared/error_state';
import { OverviewCard } from '../overview/overview_card';
import type { TabId } from '../tabs/tab_props';
import { ClaimArgumentFlyout } from './claim_argument_flyout';
import { ClaimRow } from './claim_row';
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS } from './claim_utils';
import { ClaimsExplainer } from './claims_explainer';
import { NewClaimForm } from './new_claim_form';
import { useEvidenceByIds } from './use_evidence_lookup';
import * as i18n from './translations';

type ClaimFilter = 'all' | ClaimStatus;

const isClaim = (item: InvestigationItem): item is ClaimItem => item.kind === 'claim';

const toFilter = (id: string): ClaimFilter =>
  CLAIM_STATUSES.find((status) => status === id) ?? 'all';

export interface ClaimsCardProps {
  record: InvestigationRecord;
  onOpenClaim: (claimId: string) => void;
  onNavigateTab: (tab: TabId, opts?: { itemId?: string }) => void;
}

/** The claims of the investigation, filtered by status, with a form to add one. */
export const ClaimsCard: React.FC<ClaimsCardProps> = ({ record, onOpenClaim, onNavigateTab }) => {
  const explainerId = useGeneratedHtmlId({ prefix: 'claimsExplainer' });
  const [filter, setFilter] = useState<ClaimFilter>('all');
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [whyClaim, setWhyClaim] = useState<ClaimItem | null>(null);

  const { counters } = record;
  const countsByStatus = counters.claims_by_status;
  const { data, isLoading, isError, error, refetch } = useItems(record.id, {
    kind: ['claim'],
    ...(filter === 'all' ? {} : { status: [filter] }),
    sort_field: 'ref_num',
    sort_order: 'asc',
    per_page: INVESTIGATION_LIMITS.maxPerPage,
  });
  const claims = useMemo(() => (data?.items ?? []).filter(isClaim), [data]);
  const evidenceIds = useMemo(
    () => claims.flatMap((claim) => claim.claim.supporting_evidence_ids),
    [claims]
  );
  const { byId: evidenceById } = useEvidenceByIds(record.id, evidenceIds);

  const needsReview = counters.claims_needs_review;
  const total = data?.total ?? 0;

  const filterOptions = [
    { id: 'all', label: i18n.FILTER_LABEL(i18n.FILTER_ALL, counters.claims) },
    ...CLAIM_STATUSES.map((status) => ({
      id: status,
      label: i18n.FILTER_LABEL(CLAIM_STATUS_LABELS[status], countsByStatus[status] ?? 0),
    })),
  ].map((option) => ({ ...option, 'data-test-subj': `investigationClaimFilter-${option.id}` }));

  const openEvidence = (itemId: string) => onNavigateTab('evidence', { itemId });

  return (
    <OverviewCard
      title={i18n.CLAIMS_TITLE}
      iconType={ICONS.claim}
      count={counters.claims}
      data-test-subj="investigationClaimsCard"
      action={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          {needsReview > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="warning"
                iconType={ICONS.reviewNeeded}
                data-test-subj="investigationClaimsNeedReview"
              >
                {i18n.NEED_YOUR_REVIEW(needsReview)}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType={isExplainerOpen ? ICONS.chevronDown : ICONS.chevronRight}
              iconSide="right"
              aria-expanded={isExplainerOpen}
              aria-controls={explainerId}
              onClick={() => setIsExplainerOpen((open) => !open)}
              data-test-subj="investigationClaimsHowItWorks"
            >
              {i18n.HOW_CLAIMS_WORK}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      {isExplainerOpen ? (
        <div id={explainerId}>
          <ClaimsExplainer
            aiEnabled={record.ai_enabled}
            agentName={record.agent_name ?? i18n.THE_AGENT}
          />
          <EuiSpacer size="m" />
        </div>
      ) : null}
      <EuiButtonGroup
        legend={i18n.FILTER_LEGEND}
        idSelected={filter}
        onChange={(id) => setFilter(toFilter(id))}
        buttonSize="compressed"
        options={filterOptions}
        data-test-subj="investigationClaimsFilter"
      />
      <EuiSpacer size="s" />
      {isLoading ? <EuiLoadingSpinner size="l" /> : null}
      {isError ? (
        <ErrorState title={i18n.CLAIMS_LOAD_ERROR} error={error} onRetry={() => void refetch()} />
      ) : null}
      {!isLoading && !isError && claims.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="investigationClaimsEmpty">
          {filter === 'all' ? i18n.NO_CLAIMS : i18n.NO_CLAIMS_WITH_STATUS}
        </EuiText>
      ) : null}
      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="investigationClaimsList">
        {claims.map((claim) => (
          <EuiFlexItem key={claim.id}>
            <ClaimRow
              claim={claim}
              evidenceById={evidenceById}
              onOpen={onOpenClaim}
              onWhy={setWhyClaim}
              onOpenEvidence={openEvidence}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {total > claims.length ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount={false}
            size="s"
            iconType={ICONS.info}
            title={i18n.SHOWING_FIRST(claims.length, total)}
          />
        </>
      ) : null}
      <EuiSpacer size="m" />
      <NewClaimForm record={record} onCreated={() => setFilter('all')} />
      {whyClaim ? (
        <ClaimArgumentFlyout
          record={record}
          claim={whyClaim}
          onClose={() => setWhyClaim(null)}
          onNavigateTab={onNavigateTab}
        />
      ) : null}
    </OverviewCard>
  );
};
ClaimsCard.displayName = 'ClaimsCard';
