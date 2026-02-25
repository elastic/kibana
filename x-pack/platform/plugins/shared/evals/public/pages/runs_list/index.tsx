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
        name: 'Run ID',
        sortable: true,
        truncateText: true,
        width: '200px',
        render: (runId: string) => (
          <EuiLink onClick={() => history.push(`/runs/${runId}`)}>{runId.slice(0, 12)}...</EuiLink>
        ),
      },
      {
        field: 'timestamp',
        name: 'Timestamp',
        sortable: true,
        render: (timestamp: string) => (timestamp ? new Date(timestamp).toLocaleString() : '-'),
      },
      {
        field: 'suite_id',
        name: 'Suite',
        render: (suiteId: string | undefined) =>
          suiteId ? <EuiBadge color="hollow">{suiteId}</EuiBadge> : '-',
      },
      {
        field: 'task_model',
        name: 'Task Model',
        render: (model: EvaluationRunSummary['task_model']) =>
          model ? <EuiBadge color="primary">{model.id}</EuiBadge> : '-',
      },
      {
        field: 'evaluator_model',
        name: 'Evaluator Model',
        render: (model: EvaluationRunSummary['evaluator_model']) =>
          model ? <EuiBadge color="accent">{model.id}</EuiBadge> : '-',
      },
      {
        field: 'git_branch',
        name: 'Branch',
        render: (branch: string | null) => branch ?? '-',
      },
      {
        field: 'total_repetitions',
        name: 'Reps',
        width: '60px',
      },
      {
        field: 'ci',
        name: 'CI',
        render: (ci: EvaluationRunSummary['ci']) =>
          ci?.build_url ? (
            <EuiLink href={ci.build_url} target="_blank" external>
              Build
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
      <EuiPageTemplate.Header pageTitle="Evaluations" />
      <EuiPageTemplate.Section>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFieldSearch
              placeholder="Filter by branch..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              isClearable
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {error && (
          <>
            <EuiText color="danger" size="s">
              <p>{String(error)}</p>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}
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
