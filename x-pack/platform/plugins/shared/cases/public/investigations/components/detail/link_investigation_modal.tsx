/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
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
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { useFindRecords, useLinkRecord } from '../../hooks';
import { EmptyState } from '../shared/empty_state';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import { StatusBadge } from '../shared/status_badge';
import * as i18n from './translations';

const SEARCH_DEBOUNCE_MS = 300;
const RESULT_LIMIT = 10;

const useDebouncedValue = (value: string, delayMs: number): string => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};

export interface LinkInvestigationModalProps {
  record: InvestigationRecord;
  /** Ids of the investigations that are already linked to this one. */
  linkedIds: string[];
  onClose: () => void;
}

/** Finds another investigation by display id or title and links it to this one. */
export const LinkInvestigationModal: React.FC<LinkInvestigationModalProps> = ({
  record,
  linkedIds,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId();
  const groupName = useGeneratedHtmlId({ prefix: 'link' });
  const [search, setSearch] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const { mutate: link, isLoading: isLinking } = useLinkRecord(record.id);

  const { data, isLoading, isError, error, isFetching, refetch } = useFindRecords({
    ...(debouncedSearch.length > 0 ? { search: debouncedSearch } : {}),
    per_page: RESULT_LIMIT + linkedIds.length + 1,
  });

  const candidates = useMemo(
    () =>
      (data?.records ?? [])
        .filter(
          (candidate) =>
            candidate.id !== record.id &&
            !candidate.merged_into &&
            !linkedIds.includes(candidate.id)
        )
        .slice(0, RESULT_LIMIT),
    [data, record.id, linkedIds]
  );

  const body = (() => {
    if (isError) {
      return <ErrorState title={i18n.LINK_SEARCH_ERROR} error={error} onRetry={() => refetch()} />;
    }
    if (isLoading) {
      return <LoadingState size="m" />;
    }
    if (candidates.length === 0) {
      return (
        <EmptyState title={i18n.LINK_SEARCH_EMPTY} data-test-subj="investigationLinkSearchEmpty" />
      );
    }
    return (
      <div
        role="radiogroup"
        aria-label={i18n.LINK_RESULTS}
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
          max-height: 22rem;
          overflow-y: auto;
        `}
        data-test-subj="investigationLinkResults"
      >
        {candidates.map((candidate) => (
          <div key={candidate.id} data-test-subj={`investigationLinkCandidate-${candidate.id}`}>
            <EuiCheckableCard
              id={`${groupName}-${candidate.id}`}
              name={groupName}
              checkableType="radio"
              value={candidate.id}
              checked={pickedId === candidate.id}
              onChange={() => setPickedId(candidate.id)}
              label={
                <strong>
                  {candidate.display_id} {candidate.title}
                </strong>
              }
            >
              <StatusBadge status={candidate.status} owner={candidate.owner} />
            </EuiCheckableCard>
          </div>
        ))}
      </div>
    );
  })();

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      css={css`
        width: min(640px, 100%);
      `}
      data-test-subj="investigationLinkModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.LINK_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>{i18n.LINK_INTRO(record.display_id)}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow label={i18n.LINK_SEARCH_LABEL} fullWidth>
          <EuiFieldSearch
            fullWidth
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={i18n.LINK_SEARCH_PLACEHOLDER}
            isLoading={isFetching}
            aria-label={i18n.LINK_SEARCH_LABEL}
            data-test-subj="investigationLinkSearch"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        {body}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} isDisabled={isLinking}>
              {i18n.LINK_CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={isLinking}
              isDisabled={pickedId === null}
              onClick={() => {
                if (pickedId !== null) {
                  link(pickedId, { onSuccess: onClose });
                }
              }}
              data-test-subj="investigationLinkSubmit"
            >
              {i18n.LINK_SUBMIT}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
LinkInvestigationModal.displayName = 'LinkInvestigationModal';
