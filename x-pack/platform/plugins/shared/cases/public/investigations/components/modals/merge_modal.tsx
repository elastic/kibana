/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiCheckableCard,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { useQuery } from '@kbn/react-query';
import type {
  Actor,
  InvestigationRecord,
  InvestigationStatus,
  RecordCounters,
  RelatedRecord,
} from '../../../../common/investigations/types';
import { findRecords } from '../../api/client';
import { investigationKeys } from '../../api/query_keys';
import {
  getHttpErrorMessage,
  useInvestigationToasts,
  useInvestigationsNavigation,
  useRelated,
} from '../../hooks';
import { ICONS } from '../../icons';
import { useInvestigationsServices } from '../../services';
import { getReasonSummary } from '../detail/related_reasons';
import { ConfirmModal } from '../shared/confirm_modal';
import { EmptyState } from '../shared/empty_state';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import { StatusBadge } from '../shared/status_badge';
import type { InvestigationModalProps } from './modal_props';
import * as i18n from './translations';
import { useMergeInvestigations } from './use_merge_investigations';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;
const SEARCH_RESULT_LIMIT = 10;
const OPEN_STATUSES: InvestigationStatus[] = ['open', 'in-progress'];
const MERGED_SUMMARY_PREFIX = 'Merged into ';

interface MergeCandidate {
  id: string;
  displayId: string;
  title: string;
  status: InvestigationStatus;
  owner: Actor | null;
  counters: RecordCounters;
  /** Why the server thinks it is similar. Null for search results. */
  why: string | null;
}

const fromRelated = (related: RelatedRecord): MergeCandidate => ({
  id: related.record.id,
  displayId: related.record.display_id,
  title: related.record.title,
  status: related.record.status,
  owner: related.record.owner,
  counters: related.record.counters,
  why: getReasonSummary(related),
});

const fromRecord = (record: InvestigationRecord): MergeCandidate => ({
  id: record.id,
  displayId: record.display_id,
  title: record.title,
  status: record.status,
  owner: record.owner,
  counters: record.counters,
  why: null,
});

/** A related record that was merged into something else cannot be merged again. */
const isAvailableRelated = (related: RelatedRecord, recordId: string): boolean =>
  related.record.id !== recordId &&
  !related.reasons.some(({ type }) => type === 'merged') &&
  !(related.record.close_outcome?.summary ?? '').startsWith(MERGED_SUMMARY_PREFIX);

const useDebouncedValue = (value: string, delayMs: number): string => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};

interface KeepRow {
  id: string;
  what: string;
  result: string;
}

const KEEP_COLUMNS: Array<EuiBasicTableColumn<KeepRow>> = [
  { field: 'what', name: i18n.MERGE_KEEPS_COLUMN_WHAT, width: '12em' },
  { field: 'result', name: i18n.MERGE_KEEPS_COLUMN_RESULT },
];

const getKeepRows = (here: RecordCounters, there: RecordCounters): KeepRow[] => [
  {
    id: 'evidence',
    what: i18n.MERGE_KEEPS_EVIDENCE,
    result: i18n.MERGE_KEEPS_EVIDENCE_VALUE(
      here.evidence + there.evidence,
      here.evidence,
      there.evidence
    ),
  },
  {
    id: 'claims',
    what: i18n.MERGE_KEEPS_CLAIMS,
    result: i18n.MERGE_KEEPS_CLAIMS_VALUE(here.claims + there.claims, here.claims, there.claims),
  },
  {
    id: 'alerts',
    what: i18n.MERGE_KEEPS_ALERTS,
    result: i18n.MERGE_KEEPS_ALERTS_VALUE(here.alerts + there.alerts, here.alerts, there.alerts),
  },
  { id: 'history', what: i18n.MERGE_KEEPS_HISTORY, result: i18n.MERGE_KEEPS_HISTORY_VALUE },
  { id: 'other', what: i18n.MERGE_KEEPS_OTHER, result: i18n.MERGE_KEEPS_OTHER_VALUE },
];

interface CandidateListProps {
  candidates: MergeCandidate[];
  pickedId: string | null;
  groupName: string;
  ariaLabel: string;
  onPick: (candidate: MergeCandidate) => void;
}

const CandidateList: React.FC<CandidateListProps> = ({
  candidates,
  pickedId,
  groupName,
  ariaLabel,
  onPick,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
      `}
    >
      {candidates.map((candidate) => (
        <div key={candidate.id} data-test-subj={`investigationMergeCandidate-${candidate.id}`}>
          <EuiCheckableCard
            id={`${groupName}-${candidate.id}`}
            name={groupName}
            checkableType="radio"
            value={candidate.id}
            checked={pickedId === candidate.id}
            onChange={() => onPick(candidate)}
            label={
              <strong>
                {candidate.displayId} {candidate.title}
              </strong>
            }
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <StatusBadge status={candidate.status} owner={candidate.owner} />
              </EuiFlexItem>
              {candidate.why ? (
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {candidate.why}
                  </EuiText>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{i18n.MERGE_ALERTS(candidate.counters.alerts)}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCheckableCard>
        </div>
      ))}
    </div>
  );
};
CandidateList.displayName = 'CandidateList';

/** Merges this investigation with a related one, or with any other open one found by search. */
export const MergeModal: React.FC<InvestigationModalProps> = ({ record, onClose }) => {
  const titleId = useGeneratedHtmlId();
  const groupName = useGeneratedHtmlId({ prefix: 'merge' });
  const { http } = useInvestigationsServices();
  const { showSuccess } = useInvestigationToasts();
  const { goToRecord } = useInvestigationsNavigation();
  const { mutate: merge, isLoading: isMerging } = useMergeInvestigations(record.id);

  const [picked, setPicked] = useState<MergeCandidate | null>(null);
  const [keep, setKeep] = useState<'this' | 'other'>('this');
  const [search, setSearch] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const alreadyMerged = Boolean(record.merged_into);
  const related = useRelated(record.id);
  const relatedCandidates = useMemo(
    () =>
      (related.data?.related ?? [])
        .filter((entry) => isAvailableRelated(entry, record.id))
        .map(fromRelated),
    [related.data, record.id]
  );

  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedSearch.length >= MIN_SEARCH_LENGTH;
  const searchRequest = {
    search: debouncedSearch,
    status: OPEN_STATUSES,
    per_page: SEARCH_RESULT_LIMIT,
  };
  const searchQuery = useQuery(
    investigationKeys.find(searchRequest),
    () => findRecords(http, searchRequest),
    { enabled: isSearching, retry: false, keepPreviousData: true }
  );
  const relatedIds = useMemo(
    () => new Set(relatedCandidates.map((candidate) => candidate.id)),
    [relatedCandidates]
  );
  const searchCandidates = useMemo(
    () =>
      (searchQuery.data?.records ?? [])
        .filter(
          (entry) => entry.id !== record.id && !entry.merged_into && !relatedIds.has(entry.id)
        )
        .map(fromRecord),
    [searchQuery.data, record.id, relatedIds]
  );

  const pick = (candidate: MergeCandidate) => {
    setPicked(candidate);
    setServerError(null);
  };

  const onConfirmMerge = () => {
    if (!picked) {
      return;
    }
    const target = picked;
    merge(
      { other_id: target.id, keep },
      {
        onSuccess: ({ items_moved: moved, primary, merged }) => {
          showSuccess(i18n.MERGE_SUCCESS(merged.display_id, primary.display_id, moved));
          if (primary.id !== record.id) {
            goToRecord(primary.id);
          }
          onClose();
        },
        onError: (error) => {
          setServerError(getHttpErrorMessage(error));
          setIsConfirming(false);
        },
      }
    );
  };

  if (isConfirming && picked) {
    const primaryId = keep === 'this' ? record.display_id : picked.displayId;
    const mergedId = keep === 'this' ? picked.displayId : record.display_id;
    return (
      <ConfirmModal
        title={i18n.MERGE_CONFIRM_TITLE}
        body={i18n.MERGE_CONFIRM_BODY(primaryId, mergedId)}
        confirmLabel={i18n.MERGE_CONFIRM_BUTTON}
        destructive
        isLoading={isMerging}
        onConfirm={onConfirmMerge}
        onCancel={() => setIsConfirming(false)}
        data-test-subj="investigationMergeConfirmModal"
      />
    );
  }

  const relatedBlock = (() => {
    if (related.isLoading) {
      return <LoadingState size="m" />;
    }
    if (related.isError) {
      return (
        <ErrorState
          title={i18n.MERGE_RELATED_ERROR}
          error={related.error}
          onRetry={() => related.refetch()}
        />
      );
    }
    if (relatedCandidates.length === 0) {
      return (
        <EuiText size="s" color="subdued" data-test-subj="investigationMergeRelatedEmpty">
          <p>{i18n.MERGE_RELATED_EMPTY}</p>
        </EuiText>
      );
    }
    return (
      <CandidateList
        candidates={relatedCandidates}
        pickedId={picked?.id ?? null}
        groupName={groupName}
        ariaLabel={i18n.MERGE_RELATED_HEADING}
        onPick={pick}
      />
    );
  })();

  const searchBlock = (() => {
    if (!isSearching) {
      return null;
    }
    if (searchQuery.isError) {
      return (
        <ErrorState
          title={i18n.MERGE_SEARCH_ERROR}
          error={searchQuery.error}
          onRetry={() => searchQuery.refetch()}
        />
      );
    }
    if (searchQuery.isLoading) {
      return <LoadingState size="m" />;
    }
    if (searchCandidates.length === 0) {
      return (
        <EmptyState
          title={i18n.MERGE_SEARCH_EMPTY}
          data-test-subj="investigationMergeSearchEmpty"
        />
      );
    }
    return (
      <>
        <EuiTitle size="xxs">
          <h3>{i18n.MERGE_SEARCH_RESULTS}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <CandidateList
          candidates={searchCandidates}
          pickedId={picked?.id ?? null}
          groupName={groupName}
          ariaLabel={i18n.MERGE_SEARCH_RESULTS}
          onPick={pick}
        />
      </>
    );
  })();

  const keepOptions = picked
    ? [
        {
          id: 'this',
          label: i18n.MERGE_THIS_ONE(record.display_id),
          'data-test-subj': 'investigationMergeKeepThis',
        },
        { id: 'other', label: picked.displayId, 'data-test-subj': 'investigationMergeKeepOther' },
      ]
    : [];

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      css={css`
        width: min(680px, 100%);
      `}
      data-test-subj="investigationMergeModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.MERGE_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>{i18n.MERGE_INTRO}</p>
        </EuiText>
        <EuiSpacer size="m" />
        {alreadyMerged ? (
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType={ICONS.warning}
            title={i18n.MERGE_ALREADY_MERGED}
            data-test-subj="investigationMergeAlreadyMerged"
          />
        ) : (
          <>
            <EuiTitle size="xxs">
              <h3>{i18n.MERGE_RELATED_HEADING}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            {relatedBlock}
            <EuiSpacer size="m" />
            <EuiFormRow label={i18n.MERGE_SEARCH_LABEL} helpText={i18n.MERGE_SEARCH_HELP} fullWidth>
              <EuiFieldSearch
                fullWidth
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={i18n.MERGE_SEARCH_PLACEHOLDER}
                isLoading={isSearching && searchQuery.isFetching}
                aria-label={i18n.MERGE_SEARCH_LABEL}
                data-test-subj="investigationMergeSearch"
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            {searchBlock}
          </>
        )}
        {picked ? (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>{i18n.MERGE_PRIMARY_HEADING}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiButtonGroup
              legend={i18n.MERGE_PRIMARY_LEGEND}
              options={keepOptions}
              idSelected={keep}
              onChange={(id) => setKeep(id === 'other' ? 'other' : 'this')}
              data-test-subj="investigationMergeKeep"
            />
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>{i18n.MERGE_KEEPS_HEADING}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiBasicTable
              tableCaption={i18n.MERGE_KEEPS_HEADING}
              items={getKeepRows(record.counters, picked.counters)}
              columns={KEEP_COLUMNS}
              data-test-subj="investigationMergeKeeps"
            />
          </>
        ) : null}
        {serverError ? (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType={ICONS.error}
              title={i18n.MERGE_SERVER_ERROR_TITLE}
              data-test-subj="investigationMergeServerError"
            >
              {serverError}
            </EuiCallOut>
          </>
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>{i18n.CANCEL}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => setIsConfirming(true)}
              isDisabled={!picked || alreadyMerged}
              data-test-subj="investigationMergeSubmit"
            >
              {i18n.MERGE_CONFIRM_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
MergeModal.displayName = 'MergeModal';
