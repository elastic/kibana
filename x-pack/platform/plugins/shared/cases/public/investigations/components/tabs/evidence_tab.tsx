/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  ClaimItem,
  EvidenceItem,
  EvidenceType,
  InvestigationItem,
} from '../../../../common/investigations/types';
import { useItems } from '../../hooks';
import { EVIDENCE_TYPE_ICONS, ICONS } from '../../icons';
import { AddEvidenceModal } from '../evidence/add/add_evidence_modal';
import { BulkBar } from '../evidence/bulk_bar';
import { EvidenceTable } from '../evidence/evidence_table';
import { EvidenceToolbar } from '../evidence/evidence_toolbar';
import { ExportModal } from '../evidence/export_modal';
import { EvidenceFlyout } from '../evidence/flyout/evidence_flyout';
import type { FlyoutTab } from '../evidence/flyout/evidence_flyout';
import type { DocumentView } from '../evidence/flyout/primitives';
import {
  getMaxAddressablePageIndex,
  hasActiveEvidenceFilters,
  toFilterRequest,
  useEvidenceUrlState,
} from '../evidence/evidence_state';
import {
  useCommentCounts,
  useEvidencePage,
  useRecordClaims,
  useSeenElsewhere,
} from '../evidence/use_evidence_queries';
import * as evidenceI18n from '../evidence/translations';
import { EmptyState } from '../shared/empty_state';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import type { TabProps } from './tab_props';

const isEvidenceItem = (item: InvestigationItem): item is EvidenceItem => item.kind === 'evidence';

interface AddModalState {
  kind?: EvidenceType;
  indicatorMode?: 'single' | 'import';
}

interface ExportModalState {
  ids?: string[];
}

export const EvidenceTab: React.FC<TabProps> = ({ record, onNavigateTab, openItemId }) => {
  const { euiTheme } = useEuiTheme();
  const { state, update, clearFilters, setOpenItem } = useEvidenceUrlState();
  const handoffAt = record.last_handoff?.at;
  const filter = useMemo(() => toFilterRequest(state, handoffAt), [state, handoffAt]);
  const hasFilters = hasActiveEvidenceFilters(state);

  const page = useEvidencePage(
    record.id,
    filter,
    state.pageIndex,
    state.pageSize,
    record.counters.evidence
  );
  const { data, isLoading, isFetching, error, refetch, isOutOfRange } = page;
  const items = useMemo(() => (data?.items ?? []).filter(isEvidenceItem), [data]);
  const total = data?.total ?? 0;

  const indicatorValues = useMemo(
    () => items.flatMap(({ evidence }) => (evidence.indicator ? [evidence.indicator.value] : [])),
    [items]
  );
  const { data: lookup } = useSeenElsewhere(record.id, indicatorValues);
  const seenByValue = useMemo(() => new Map(Object.entries(lookup?.values ?? {})), [lookup]);

  const { claims } = useRecordClaims(record.id);
  const claimsByEvidenceId = useMemo(() => {
    const byEvidence = new Map<string, ClaimItem[]>();
    claims.forEach((claim) => {
      new Set([
        ...claim.claim.supporting_evidence_ids,
        ...claim.claim.opposing_evidence_ids,
      ]).forEach((evidenceId) => {
        byEvidence.set(evidenceId, [...(byEvidence.get(evidenceId) ?? []), claim]);
      });
    });
    return byEvidence;
  }, [claims]);

  const { counts: commentCounts, isExact: commentCountsExact } = useCommentCounts(
    record.id,
    record.counters.comments
  );
  const { data: newSince } = useItems(
    record.id,
    { kind: ['evidence'], created_after: handoffAt, per_page: 1 },
    { enabled: Boolean(handoffAt) }
  );

  const [selected, setSelected] = useState<EvidenceItem[]>([]);
  const [addModal, setAddModal] = useState<AddModalState | null>(null);
  const [exportModal, setExportModal] = useState<ExportModalState | null>(null);
  const [flyoutTab, setFlyoutTab] = useState<FlyoutTab>('details');
  const [documentView, setDocumentView] = useState<DocumentView>('table');

  // A different result set invalidates the selection.
  useEffect(() => {
    setSelected([]);
  }, [filter, state.pageIndex, state.pageSize]);

  // A page past the end (after deletes, or a stale URL) goes back to a page that exists.
  useEffect(() => {
    if (isOutOfRange) {
      update({ pageIndex: getMaxAddressablePageIndex(state.pageSize) });
      return;
    }
    if (data && !isFetching && data.items.length === 0 && state.pageIndex > 0) {
      update({ pageIndex: Math.max(Math.ceil(data.total / state.pageSize) - 1, 0) });
    }
  }, [data, isFetching, isOutOfRange, state.pageIndex, state.pageSize, update]);

  const openItem = useCallback(
    (itemId: string, tab?: 'comments') => {
      setFlyoutTab(tab ?? 'details');
      setOpenItem(itemId);
    },
    [setOpenItem]
  );
  const closeItem = useCallback(() => {
    setFlyoutTab('details');
    setOpenItem(undefined);
  }, [setOpenItem]);
  const openClaim = useCallback(
    (claimId: string) => onNavigateTab('overview', { itemId: claimId }),
    [onNavigateTab]
  );

  const modals = (
    <>
      {addModal ? (
        <AddEvidenceModal
          recordId={record.id}
          initialKind={addModal.kind}
          initialIndicatorMode={addModal.indicatorMode}
          onClose={() => setAddModal(null)}
        />
      ) : null}
      {exportModal ? (
        <ExportModal
          recordId={record.id}
          filter={filter}
          ids={exportModal.ids}
          onClose={() => setExportModal(null)}
        />
      ) : null}
      {openItemId ? (
        <EvidenceFlyout
          key={openItemId}
          recordId={record.id}
          itemId={openItemId}
          initialTab={flyoutTab}
          documentView={documentView}
          onDocumentViewChange={setDocumentView}
          onClose={closeItem}
          onOpenClaim={openClaim}
          onOpenConversation={() => onNavigateTab('conversation')}
        />
      ) : null}
    </>
  );

  const renderContent = (): React.ReactNode => {
    if (isLoading && !data) {
      return <LoadingState label={evidenceI18n.LOADING} />;
    }

    if (error && !data) {
      return <ErrorState title={evidenceI18n.LOAD_ERROR} error={error} onRetry={refetch} />;
    }

    if (data && total === 0 && !hasFilters && !isFetching) {
      return (
        <EmptyState
          iconType={EVIDENCE_TYPE_ICONS.note}
          title={evidenceI18n.EMPTY_TITLE}
          body={evidenceI18n.EMPTY_BODY}
          actions={
            <>
              <EuiButton
                fill
                iconType={ICONS.add}
                onClick={() => setAddModal({})}
                data-test-subj="investigationEvidenceEmptyAdd"
              >
                {evidenceI18n.ADD_EVIDENCE}
              </EuiButton>
              <EuiButtonEmpty
                iconType={ICONS.upload}
                onClick={() => setAddModal({ kind: 'indicator', indicatorMode: 'import' })}
                data-test-subj="investigationEvidenceEmptyImport"
              >
                {evidenceI18n.IMPORT_CSV}
              </EuiButtonEmpty>
            </>
          }
          data-test-subj="investigationEvidenceEmpty"
        />
      );
    }

    return (
      <>
        <EvidenceToolbar
          state={state}
          facets={data?.facets}
          hasHandoff={Boolean(handoffAt)}
          newSinceHandoffCount={newSince?.total}
          onChange={update}
          onClear={clearFilters}
          onExport={() => setExportModal({})}
          onImport={() => setAddModal({ kind: 'indicator', indicatorMode: 'import' })}
          onAdd={() => setAddModal({})}
        />
        <EuiSpacer size="m" />
        {selected.length > 0 ? (
          <>
            <BulkBar
              recordId={record.id}
              selected={selected}
              claims={claims}
              onClear={() => setSelected([])}
              onExportSelected={() => setExportModal({ ids: selected.map(({ id }) => id) })}
            />
            <EuiSpacer size="s" />
          </>
        ) : null}
        {error ? (
          <ErrorState title={evidenceI18n.LOAD_ERROR} error={error} onRetry={refetch} />
        ) : (
          <EvidenceTable
            items={items}
            total={total}
            state={state}
            isLoading={isFetching}
            noItemsMessage={
              hasFilters ? (
                <div data-test-subj="investigationEvidenceNoResults">
                  <EuiText size="s" color="subdued">
                    <p>{evidenceI18n.NO_RESULTS}</p>
                  </EuiText>
                  <EuiButtonEmpty size="s" onClick={clearFilters}>
                    {evidenceI18n.CLEAR_FILTERS}
                  </EuiButtonEmpty>
                </div>
              ) : (
                evidenceI18n.NO_RESULTS
              )
            }
            selected={selected}
            onSelectionChange={setSelected}
            onChange={update}
            onOpen={openItem}
            openItemId={openItemId}
            seenByValue={seenByValue}
            claimsByEvidenceId={claimsByEvidenceId}
            commentCounts={commentCounts}
            commentCountsExact={commentCountsExact}
            onOpenClaim={openClaim}
          />
        )}
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            margin-block-start: ${euiTheme.size.s};
          `}
          data-test-subj="investigationEvidenceTotal"
        >
          {evidenceI18n.TOTAL_SUMMARY(total, record.counters.evidence)}
        </EuiText>
      </>
    );
  };

  return (
    <div data-test-subj="investigationEvidenceTab">
      {renderContent()}
      {modals}
    </div>
  );
};
EvidenceTab.displayName = 'EvidenceTab';
