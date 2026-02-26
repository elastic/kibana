/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiPageTemplate,
  EuiBasicTable,
  EuiBadge,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiSpacer,
  EuiText,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import type { EvaluationRunSummary } from '@kbn/evals-common';
import { useEvaluationRuns } from '../../hooks/use_evals_api';
import * as i18n from './translations';

export const RunsListPage: React.FC = () => {
  const history = useHistory();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState('');

  const { data, isLoading, error } = useEvaluationRuns({
    page: pageIndex + 1,
    perPage: pageSize,
    branch: searchText || undefined,
  });

  const columns: Array<EuiBasicTableColumn<EvaluationRunSummary>> = useMemo(
    () => [
      {
        field: 'run_id',
        name: i18n.COLUMN_RUN_ID,
        sortable: true,
        truncateText: true,
        width: '200px',
        render: (runId: string) => (
          <EuiLink onClick={() => history.push(`/runs/${runId}`)}>{runId.slice(0, 12)}...</EuiLink>
        ),
      },
      {
        field: 'timestamp',
        name: i18n.COLUMN_TIMESTAMP,
        sortable: true,
        render: (timestamp: string) => (timestamp ? new Date(timestamp).toLocaleString() : '-'),
      },
      {
        field: 'suite_id',
        name: i18n.COLUMN_SUITE,
        render: (suiteId: string | undefined) =>
          suiteId ? <EuiBadge color="hollow">{suiteId}</EuiBadge> : '-',
      },
      {
        field: 'task_model',
        name: i18n.COLUMN_TASK_MODEL,
        render: (model: EvaluationRunSummary['task_model']) =>
          model ? <EuiBadge color="primary">{model.id}</EuiBadge> : '-',
      },
      {
        field: 'evaluator_model',
        name: i18n.COLUMN_EVALUATOR_MODEL,
        render: (model: EvaluationRunSummary['evaluator_model']) =>
          model ? <EuiBadge color="accent">{model.id}</EuiBadge> : '-',
      },
      {
        field: 'git_branch',
        name: i18n.COLUMN_BRANCH,
        render: (branch: string | null) => branch ?? '-',
      },
      {
        field: 'total_repetitions',
        name: i18n.COLUMN_REPS,
        width: '60px',
      },
      {
        field: 'ci',
        name: i18n.COLUMN_CI,
        render: (ci: EvaluationRunSummary['ci']) =>
          ci?.build_url ? (
            <EuiLink href={ci.build_url} target="_blank" external>
              {i18n.CI_BUILD_LINK}
            </EuiLink>
          ) : (
            '-'
          ),
      },
    ],
    [history]
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 25, 50],
  };

  const onTableChange = ({ page }: CriteriaWithPagination<EvaluationRunSummary>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header pageTitle={i18n.PAGE_TITLE} />
      <EuiPageTemplate.Section>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFieldSearch
              placeholder={i18n.SEARCH_PLACEHOLDER}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              isClearable
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {error ? (
          <>
            <EuiText color="danger" size="s">
              <p>{String(error)}</p>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        ) : null}
        <EuiBasicTable<EvaluationRunSummary>
          items={data?.runs ?? []}
          columns={columns}
          loading={isLoading}
          pagination={pagination}
          onChange={onTableChange}
          rowProps={(item) => ({
            onClick: () => history.push(`/runs/${item.run_id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
