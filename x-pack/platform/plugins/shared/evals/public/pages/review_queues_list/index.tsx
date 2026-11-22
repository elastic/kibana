/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiEmptyPrompt,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageSection,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedDate } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { ReviewQueueWithCounts } from '@kbn/evals-common';
import { useHistory } from 'react-router-dom';
import { useReviewQueues } from '../../hooks/use_review_queues_api';
import { ReviewPrivilegeGuard } from '../../components/review_privilege_guard';
import * as i18n from './translations';

export const REVIEW_QUEUES_PATH = '/review' as const;

const ReviewQueuesListContent: React.FC = () => {
  const history = useHistory();
  const { data, isLoading, error, refetch } = useReviewQueues();
  const queues = data?.queues ?? [];

  const columns: Array<EuiBasicTableColumn<ReviewQueueWithCounts>> = [
    {
      field: 'name',
      name: i18n.NAME_COLUMN,
      render: (name: string, queue) => (
        <EuiLink
          data-test-subj="evalsReviewQueueLink"
          {...reactRouterNavigate(history, `${REVIEW_QUEUES_PATH}/${encodeURIComponent(queue.id)}`)}
        >
          <strong>{name}</strong>
        </EuiLink>
      ),
    },
    {
      field: 'evaluator_name',
      name: i18n.EVALUATOR_COLUMN,
      render: (_: string, queue) =>
        i18n.getEvaluatorLabel(queue.evaluator_name, queue.evaluator_version),
    },
    {
      field: 'source_filter',
      name: i18n.SOURCE_COLUMN,
      render: (_: unknown, queue) =>
        queue.source_filter.source === 'online' ? i18n.SOURCE_ONLINE : i18n.SOURCE_EXPERIMENT,
    },
    {
      field: 'counts',
      name: i18n.PROGRESS_COLUMN,
      render: (_: unknown, queue) =>
        i18n.getProgress(
          queue.counts.reviewed + queue.counts.skipped,
          queue.counts.pending + queue.counts.reviewed + queue.counts.skipped
        ),
    },
    {
      field: 'created_at',
      name: i18n.CREATED_COLUMN,
      render: (createdAt: string) => <FormattedDate value={createdAt} />,
    },
  ];

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (error) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="warning"
        title={<h2>{i18n.LOAD_ERROR_TITLE}</h2>}
        actions={
          <EuiButton onClick={() => refetch()} data-test-subj="evalsReviewQueuesRetry">
            {i18n.RETRY}
          </EuiButton>
        }
      />
    );
  }

  if (queues.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="listCheck"
        title={<h2>{i18n.EMPTY_TITLE}</h2>}
        body={<p>{i18n.EMPTY_BODY}</p>}
      />
    );
  }

  return (
    <EuiPageSection>
      <EuiBasicTable<ReviewQueueWithCounts>
        tableCaption={i18n.TABLE_CAPTION}
        data-test-subj="evalsReviewQueuesTable"
        items={queues}
        columns={columns}
        rowHeader="name"
      />
    </EuiPageSection>
  );
};

export const ReviewQueuesListPage: React.FC = () => (
  <ReviewPrivilegeGuard>
    <ReviewQueuesListContent />
  </ReviewPrivilegeGuard>
);
