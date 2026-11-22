/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiProgress,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import type { BulkRecordOutcome, BulkRecordResult, BulkRunState } from '../../../hooks';
import { ICONS } from '../../../icons';
import * as i18n from './translations';

const OUTCOME_ORDER: Record<BulkRecordOutcome, number> = { blocked: 0, done: 1, unchanged: 2 };

const OutcomeBadge: React.FC<{ outcome: BulkRecordOutcome }> = ({ outcome }) => {
  if (outcome === 'blocked') {
    return (
      <EuiBadge color="danger" iconType={ICONS.warning}>
        {i18n.RESULT_BLOCKED}
      </EuiBadge>
    );
  }
  if (outcome === 'done') {
    return (
      <EuiBadge color="success" iconType={ICONS.check}>
        {i18n.RESULT_DONE}
      </EuiBadge>
    );
  }
  return <EuiBadge color="hollow">{i18n.RESULT_UNCHANGED}</EuiBadge>;
};
OutcomeBadge.displayName = 'OutcomeBadge';

const columns: Array<EuiBasicTableColumn<BulkRecordResult>> = [
  {
    field: 'displayId',
    name: i18n.COLUMN_ID,
    width: '110px',
    render: (displayId: string) => (
      <span
        css={css`
          white-space: nowrap;
        `}
      >
        {displayId}
      </span>
    ),
  },
  {
    field: 'title',
    name: i18n.COLUMN_TITLE,
    width: '240px',
  },
  {
    field: 'outcome',
    name: i18n.COLUMN_RESULT,
    width: '150px',
    render: (outcome: BulkRecordOutcome) => <OutcomeBadge outcome={outcome} />,
  },
  {
    field: 'message',
    name: i18n.COLUMN_REASON,
    render: (message: string | undefined, result) =>
      result.outcome === 'blocked' ? (
        <span data-test-subj={`investigationBulkReason-${result.displayId}`}>
          {message ?? i18n.RESULT_NO_MESSAGE}
        </span>
      ) : null,
  },
];

export interface BulkResultsModalProps {
  /** What is being done, as a short phrase: "Assigning people". */
  title: string;
  run: BulkRunState;
  onClose: () => void;
}

/**
 * Shows the progress of a bulk action while it runs and, when it is done, what happened to each
 * selected investigation: updated, unchanged, or blocked with the message the server gave.
 */
export const BulkResultsModal: React.FC<BulkResultsModalProps> = ({ title, run, onClose }) => {
  const titleId = useGeneratedHtmlId();
  const { phase, total, completed, results } = run;
  const isRunning = phase === 'running';

  const sorted = useMemo(
    () =>
      [...results].sort(
        (first, second) => OUTCOME_ORDER[first.outcome] - OUTCOME_ORDER[second.outcome]
      ),
    [results]
  );
  const counts = useMemo(
    () => ({
      done: results.filter(({ outcome }) => outcome === 'done').length,
      unchanged: results.filter(({ outcome }) => outcome === 'unchanged').length,
      blocked: results.filter(({ outcome }) => outcome === 'blocked').length,
    }),
    [results]
  );

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      css={css`
        width: min(860px, 100%);
      `}
      data-test-subj="investigationBulkResults"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {isRunning ? (
          <div data-test-subj="investigationBulkProgress" aria-live="polite">
            <EuiProgress value={completed} max={total} size="m" color="primary" />
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              {i18n.PROGRESS(completed, total)}
            </EuiText>
          </div>
        ) : (
          <>
            <EuiCallOut
              announceOnMount
              size="s"
              color={counts.blocked > 0 ? 'warning' : 'success'}
              iconType={counts.blocked > 0 ? ICONS.warning : ICONS.check}
              title={
                counts.blocked > 0
                  ? i18n.SUMMARY_SOME_BLOCKED(counts.done, counts.unchanged, counts.blocked)
                  : i18n.SUMMARY_TOAST_DONE(counts.done, counts.unchanged)
              }
              data-test-subj="investigationBulkSummary"
            />
            <EuiSpacer size="m" />
            <EuiBasicTable<BulkRecordResult>
              tableCaption={i18n.RESULTS_ARIA}
              items={sorted}
              itemId="recordId"
              columns={columns}
              tableLayout="fixed"
              rowProps={({ displayId, outcome }) => ({
                'data-test-subj': `investigationBulkResult-${displayId}`,
                'data-outcome': outcome,
              })}
              data-test-subj="investigationBulkResultList"
            />
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton
          fill
          onClick={onClose}
          isDisabled={isRunning}
          data-test-subj="investigationBulkDone"
        >
          {i18n.DONE_BUTTON}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
BulkResultsModal.displayName = 'BulkResultsModal';
