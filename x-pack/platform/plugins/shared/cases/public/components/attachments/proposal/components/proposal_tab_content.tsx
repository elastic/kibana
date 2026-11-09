/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import { MAX_ROOT_PROPOSAL_IDS } from '@kbn/proposals-common';
import type { CommonAttachmentListViewProps } from '../../../../client/attachment_framework/types';
import { FormattedRelativePreferenceDate } from '../../../formatted_date';
import { useGetProposalChains } from '../api';
import type { ProposalRow } from '../utils';
import { getAttachedProposals, matchesSearchTerm, toProposalRows } from '../utils';
import * as i18n from '../translations';
import { ProposalStatusBadge } from './proposal_status_badge';
import { useOpenProposalConversation } from './use_open_proposal_conversation';

const ProposalTitle = ({
  proposal,
  openConversation,
}: {
  proposal: ProposalWithMetadata;
  openConversation?: (conversationId: string) => void;
}) =>
  openConversation ? (
    <EuiLink
      onClick={() => openConversation(proposal.conversationId)}
      data-test-subj={`proposal-row-title-${proposal.id}`}
    >
      {proposal.title}
    </EuiLink>
  ) : (
    <>{proposal.title}</>
  );

/** The revision that replaced an attached proposal, shown under its row. */
const LatestRevision = ({
  proposal,
  openConversation,
}: {
  proposal: ProposalWithMetadata;
  openConversation?: (conversationId: string) => void;
}) => (
  <EuiFlexGroup
    gutterSize="m"
    alignItems="center"
    responsive={false}
    wrap
    data-test-subj={`proposal-row-latest-revision-${proposal.id}`}
  >
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <strong>{i18n.LATEST_REVISION}</strong>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <ProposalTitle proposal={proposal} openConversation={openConversation} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <ProposalStatusBadge proposal={proposal} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        {i18n.REVISION_NUMBER(proposal.revision ?? 1)}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        <FormattedRelativePreferenceDate value={proposal.createdAt} />
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

/**
 * One row per proposal attached to the case. A row whose proposal was revised expands to show the
 * latest revision. A proposal that cannot be read is left out. Titles open the investigation.
 */
export const ProposalTabContent = ({
  caseData,
  searchTerm,
  onRemove,
  isRemoving,
}: CommonAttachmentListViewProps) => {
  const attached = useMemo(() => getAttachedProposals(caseData.comments), [caseData.comments]);
  // Sorted so the query key does not change with the attachment order.
  const rootProposalIds = useMemo(
    () =>
      [...new Set(attached.map(({ rootProposalId }) => rootProposalId))]
        .sort()
        .slice(0, MAX_ROOT_PROPOSAL_IDS),
    [attached]
  );
  // `isInitialLoading`, not `isLoading`: a disabled query (no chains) stays loading in v4.
  const { data, isInitialLoading, isError } = useGetProposalChains(rootProposalIds);
  const openConversation = useOpenProposalConversation();
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  const rows = useMemo(
    () =>
      toProposalRows(attached, data?.proposals ?? []).filter((row) =>
        matchesSearchTerm(row, searchTerm)
      ),
    [attached, data?.proposals, searchTerm]
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const itemIdToExpandedRowMap = useMemo(
    () =>
      Object.fromEntries(
        rows.flatMap(({ proposal, latestRevision }) =>
          latestRevision && expandedIds.has(proposal.id)
            ? [
                [
                  proposal.id,
                  <LatestRevision proposal={latestRevision} openConversation={openConversation} />,
                ],
              ]
            : []
        )
      ),
    [rows, expandedIds, openConversation]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<ProposalRow>>>(
    () => [
      {
        name: i18n.COLUMN_TITLE,
        render: ({ proposal }: ProposalRow) => (
          <ProposalTitle proposal={proposal} openConversation={openConversation} />
        ),
      },
      {
        name: i18n.COLUMN_STATUS,
        width: '160px',
        render: ({ proposal }: ProposalRow) => <ProposalStatusBadge proposal={proposal} />,
      },
      {
        name: i18n.COLUMN_IMPACT,
        width: '100px',
        render: ({ proposal }: ProposalRow) => i18n.IMPACT_LABELS[proposal.impact],
      },
      {
        name: i18n.COLUMN_REVISION,
        width: '90px',
        render: ({ proposal }: ProposalRow) => proposal.revision ?? 1,
      },
      {
        name: i18n.COLUMN_CREATED,
        width: '160px',
        render: ({ proposal }: ProposalRow) => (
          <FormattedRelativePreferenceDate value={proposal.createdAt} />
        ),
      },
      ...(onRemove
        ? [
            {
              name: i18n.COLUMN_ACTIONS,
              width: '80px',
              render: ({ proposal }: ProposalRow) => (
                <EuiToolTip content={i18n.REMOVE_FROM_CASE} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    aria-label={i18n.REMOVE_FROM_CASE}
                    isDisabled={isRemoving}
                    onClick={() => onRemove({ attachmentIds: [proposal.id] })}
                    data-test-subj={`proposal-row-remove-${proposal.id}`}
                  />
                </EuiToolTip>
              ),
            },
          ]
        : []),
      {
        width: '40px',
        isExpander: true,
        name: (
          <EuiScreenReaderOnly>
            <span>{i18n.SHOW_LATEST_REVISION}</span>
          </EuiScreenReaderOnly>
        ),
        render: ({ proposal, latestRevision }: ProposalRow) => {
          if (!latestRevision) {
            return null;
          }
          const isExpanded = expandedIds.has(proposal.id);
          const label = isExpanded ? i18n.HIDE_LATEST_REVISION : i18n.SHOW_LATEST_REVISION;
          return (
            <EuiToolTip content={label} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType={isExpanded ? 'chevronSingleUp' : 'chevronSingleDown'}
                aria-label={label}
                aria-expanded={isExpanded}
                onClick={() => toggleExpanded(proposal.id)}
                data-test-subj={`proposal-row-expand-${proposal.id}`}
              />
            </EuiToolTip>
          );
        },
      },
    ],
    [openConversation, onRemove, isRemoving, expandedIds, toggleExpanded]
  );

  if (isError) {
    return (
      <KbnDangerCallout size="s" title={i18n.PROPOSAL_LOAD_ERROR} data-test-subj="proposal-tab-error">
        {i18n.PROPOSAL_LOAD_ERROR_BODY}
      </KbnDangerCallout>
    );
  }

  return (
    <EuiBasicTable<ProposalRow>
      tableCaption={i18n.PROPOSAL_DISPLAY_NAME}
      items={rows}
      itemId={({ proposal }) => proposal.id}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      columns={columns}
      loading={isInitialLoading}
      // The section shows only for a case with proposals, so an empty table is a search or access miss.
      noItemsMessage={searchTerm ? i18n.NO_MATCHING_PROPOSALS : i18n.NO_READABLE_PROPOSALS}
      data-test-subj="proposal-tab-table"
    />
  );
};

ProposalTabContent.displayName = 'ProposalTabContent';
