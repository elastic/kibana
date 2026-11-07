/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { CaseViewSectionProps, RelatedByReason } from '@kbn/cases-plugin/public';
import { matchesRelatedFilters } from '@kbn/cases-plugin/public';
import { parseAiVerdict } from '../../common/cases_bridge';
import type { Investigation } from '../../common';
import { fetchLinkedInvestigationSummaries, fetchLinkedInvestigations } from './api';
import { getLinkedInvestigationIds, useCanLinkInvestigations } from './case_data';
import { LinkInvestigationsModal } from './link_investigations_modal';
import { RELATED } from './translations';

const SEVERITY_COLORS: Record<string, string> = {
  low: 'subdued',
  medium: 'warning',
  high: 'risk',
  critical: 'danger',
};

export const linkedInvestigationsQueryKey = (caseId: string, ids: string[]) =>
  ['agenticInvestigations', 'casesBridge', 'linked', caseId, ids] as const;

export const useLinkedInvestigations = (caseId: string, ids: string[]) => {
  const { services } = useKibana<CoreStart>();
  return useQuery({
    queryKey: linkedInvestigationsQueryKey(caseId, ids),
    queryFn: ({ signal }) => fetchLinkedInvestigations(services.http, ids, signal),
    enabled: ids.length > 0,
    // Live, not a snapshot: read again when the tab is opened or regains focus, not on a timer.
    staleTime: 30_000,
  });
};

/** One batched read for the counts the sidebar and the close modal show. */
export const useLinkedInvestigationSummaries = (caseId: string, ids: string[]) => {
  const { services } = useKibana<CoreStart>();
  return useQuery({
    queryKey: ['agenticInvestigations', 'casesBridge', 'linkedSummaries', caseId, ids],
    queryFn: ({ signal }) => fetchLinkedInvestigationSummaries(services.http, ids, signal),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
};

/** Why a linked investigation is related: always Linked, plus AI verdict when it matches the case's. */
export const getInvestigationReasons = (
  investigation: Pick<Investigation, 'metadata'>,
  caseVerdict: string | null | undefined
): RelatedByReason[] =>
  caseVerdict && parseAiVerdict(investigation.metadata.verdict) === caseVerdict
    ? ['linked', 'aiVerdict']
    : ['linked'];

const pendingProposals = (investigation: Investigation) =>
  investigation.proposals.filter(({ status }) => status === 'pending');

/**
 * The Related tab's Investigations section: each investigation linked to the case, read live, with
 * its status, AI verdict, and pending proposals. Proposals stay owned by the investigation, so the
 * case shows them read-only with a way back to AlertZero.
 */
export const RelatedInvestigationsSection: React.FC<CaseViewSectionProps> = ({
  caseData,
  canUpdate,
  refreshCase,
  relatedFilters,
}) => {
  const { services } = useKibana<CoreStart & { agentBuilder?: AgentBuilderPluginStart }>();
  const queryClient = useQueryClient();
  const ids = useMemo(() => getLinkedInvestigationIds(caseData), [caseData]);
  const { data, isLoading, isError, refetch } = useLinkedInvestigations(caseData.id, ids);
  const canLink = useCanLinkInvestigations(canUpdate);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const openInvestigation = useCallback(
    (conversationId: string) => {
      void services.agentBuilder?.openConversationDetails({ conversationId });
    },
    [services.agentBuilder]
  );

  const caseVerdict = caseData.aiVerdict?.verdict;
  const rows = useMemo(
    () =>
      (data ?? [])
        .flatMap((result) => (result.status === 'ok' ? [result.investigation] : []))
        .filter((investigation) =>
          matchesRelatedFilters(
            {
              reasons: getInvestigationReasons(investigation, caseVerdict),
              isClosed: investigation.metadata.status === 'closed',
            },
            relatedFilters
          )
        ),
    [data, caseVerdict, relatedFilters]
  );
  const inaccessibleCount = (data ?? []).filter(({ status }) => status === 'inaccessible').length;

  const columns: Array<EuiBasicTableColumn<Investigation>> = [
    {
      name: RELATED.columnInvestigation,
      render: (investigation: Investigation) => (
        // The cell content is a flex row: without a zero min-width this block grows to its text
        // and the truncated summary runs under the next columns instead of ending in an ellipsis.
        <div css={{ minWidth: 0, width: '100%' }}>
          <div className="eui-textTruncate">
            <EuiLink
              onClick={() => openInvestigation(investigation.id)}
              title={investigation.title || RELATED.untitled}
              data-test-subj="cases-bridge-related-investigation-title"
            >
              {investigation.title || RELATED.untitled}
            </EuiLink>
          </div>
          {investigation.metadata.summary ? (
            <EuiText
              size="xs"
              color="subdued"
              className="eui-textTruncate"
              title={investigation.metadata.summary}
            >
              {investigation.metadata.summary}
            </EuiText>
          ) : null}
        </div>
      ),
    },
    {
      name: RELATED.columnStatus,
      width: '7em',
      render: (investigation: Investigation) => (
        <EuiBadge color={investigation.metadata.status === 'closed' ? 'default' : 'primary'}>
          {investigation.metadata.status === 'closed' ? RELATED.statusClosed : RELATED.statusOpen}
        </EuiBadge>
      ),
    },
    {
      name: RELATED.columnSeverity,
      width: '7em',
      render: (investigation: Investigation) =>
        investigation.metadata.severity ? (
          <EuiHealth
            color={SEVERITY_COLORS[investigation.metadata.severity] ?? 'subdued'}
            data-test-subj="cases-bridge-related-severity"
          >
            {RELATED.severity[investigation.metadata.severity] ?? investigation.metadata.severity}
          </EuiHealth>
        ) : (
          <EuiText size="xs" color="subdued">
            {RELATED.none}
          </EuiText>
        ),
    },
    {
      name: RELATED.columnVerdict,
      width: '20%',
      render: (investigation: Investigation) =>
        investigation.metadata.verdict ? (
          <EuiText
            size="xs"
            className="eui-textTruncate"
            css={{ minWidth: 0, width: '100%' }}
            title={investigation.metadata.verdict}
          >
            {investigation.metadata.verdict}
          </EuiText>
        ) : (
          <EuiText size="xs" color="subdued">
            {RELATED.none}
          </EuiText>
        ),
    },
    {
      name: RELATED.columnProposals,
      width: '9.5em',
      render: (investigation: Investigation) => {
        const pending = pendingProposals(investigation);
        if (pending.length === 0) {
          return (
            <EuiText size="xs" color="subdued">
              {RELATED.none}
            </EuiText>
          );
        }
        const isExpanded = expanded[investigation.id] === true;
        return (
          <EuiButtonEmpty
            size="xs"
            flush="left"
            iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? RELATED.hideProposals(pending.length)
                : RELATED.showProposals(pending.length)
            }
            onClick={() =>
              setExpanded((current) => ({ ...current, [investigation.id]: !isExpanded }))
            }
            data-test-subj="cases-bridge-related-proposals-toggle"
          >
            {RELATED.pending(pending.length)}
          </EuiButtonEmpty>
        );
      },
    },
    {
      name: RELATED.columnRelatedBy,
      width: '8em',
      render: (investigation: Investigation) => (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">{RELATED.linkedBadge}</EuiBadge>
          </EuiFlexItem>
          {getInvestigationReasons(investigation, caseVerdict).includes('aiVerdict') ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="cases-bridge-related-by-ai-verdict">
                {RELATED.relatedByAiVerdict}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ),
    },
    {
      name: RELATED.columnActions,
      align: 'right',
      width: '6em',
      render: (investigation: Investigation) => (
        <EuiButtonEmpty
          size="xs"
          onClick={() => openInvestigation(investigation.id)}
          data-test-subj="cases-bridge-related-open"
        >
          {RELATED.open}
        </EuiButtonEmpty>
      ),
    },
  ];

  const itemIdToExpandedRowMap = Object.fromEntries(
    rows
      .filter((investigation) => expanded[investigation.id])
      .map((investigation) => [
        investigation.id,
        <EuiPanel color="subdued" paddingSize="s" hasShadow={false} key={investigation.id}>
          {pendingProposals(investigation).map((proposal) => (
            <EuiFlexGroup
              key={proposal.id}
              gutterSize="s"
              alignItems="center"
              responsive={false}
              data-test-subj="cases-bridge-related-proposal"
            >
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">{RELATED.pendingBadge}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{proposal.title}</strong>
                </EuiText>
                {proposal.comment ? (
                  <EuiText size="xs" color="subdued">
                    {proposal.comment}
                  </EuiText>
                ) : null}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => openInvestigation(investigation.id)}
                  data-test-subj="cases-bridge-related-review-proposal"
                >
                  {RELATED.reviewInAlertZero}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {RELATED.ownedBy}
          </EuiText>
        </EuiPanel>,
      ])
  );

  return (
    <section data-test-subj="cases-bridge-related-investigations">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{RELATED.title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {canLink ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="link"
              onClick={() => setIsPickerOpen(true)}
              data-test-subj="cases-bridge-link-investigation"
            >
              {RELATED.linkInvestigation}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isError ? (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          size="s"
          title={RELATED.errorTitle}
          data-test-subj="cases-bridge-related-error"
        >
          <p>{RELATED.errorBody}</p>
          <EuiButton
            size="s"
            color="danger"
            onClick={() => refetch()}
            data-test-subj="cases-bridge-related-retry"
          >
            {RELATED.retry}
          </EuiButton>
        </EuiCallOut>
      ) : isLoading && ids.length > 0 ? (
        <EuiSkeletonText lines={3} data-test-subj="cases-bridge-related-loading" />
      ) : (
        <>
          <EuiBasicTable<Investigation>
            tableCaption={RELATED.title}
            items={rows}
            columns={columns}
            itemId="id"
            itemIdToExpandedRowMap={itemIdToExpandedRowMap}
            tableLayout="fixed"
            noItemsMessage={RELATED.none}
            data-test-subj="cases-bridge-related-table"
          />
          {inaccessibleCount > 0 ? (
            <>
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued" data-test-subj="cases-bridge-related-inaccessible">
                {RELATED.inaccessible(inaccessibleCount)}
              </EuiText>
            </>
          ) : null}
        </>
      )}
      {isPickerOpen ? (
        <LinkInvestigationsModal
          caseData={caseData}
          linkedIds={ids}
          onClose={() => setIsPickerOpen(false)}
          onLinked={() => {
            setIsPickerOpen(false);
            void queryClient.invalidateQueries(['agenticInvestigations', 'casesBridge']);
            refreshCase();
          }}
        />
      ) : null}
    </section>
  );
};
RelatedInvestigationsSection.displayName = 'RelatedInvestigationsSection';
