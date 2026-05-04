/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButton,
  EuiEmptyPrompt,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiPageSection,
  EuiSelect,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
  type EuiTableSelectionType,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import type { EvaluationRunSummary } from '@kbn/evals-common';
import { useEvaluationRuns } from '../../hooks/use_evals_api';
import { resolvePrUrl } from '../../utils/pr_url';
import * as i18n from './translations';

export const RunsListPage: React.FC = () => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [suiteIdFilter, setSuiteIdFilter] = useState('');
  const [selectedRuns, setSelectedRuns] = useState<EvaluationRunSummary[]>([]);

  const { data, isLoading, error, refetch } = useEvaluationRuns({
    page: pageIndex + 1,
    perPage: pageSize,
    branch: searchText || undefined,
    suiteId: suiteIdFilter || undefined,
  });

  const { data: suiteFilterData } = useEvaluationRuns({
    page: 1,
    perPage: 100,
    branch: searchText || undefined,
  });

  const suiteOptions = useMemo(() => {
    const options = [{ value: '', text: i18n.SUITE_FILTER_ALL_OPTION }];
    const suiteSet = new Set<string>();

    for (const run of suiteFilterData?.runs ?? []) {
      if (run.suite_id) {
        suiteSet.add(run.suite_id);
      }
    }

    for (const id of Array.from(suiteSet).sort()) {
      options.push({ value: id, text: id });
    }

    return options;
  }, [suiteFilterData?.runs]);

  const columns: Array<EuiBasicTableColumn<EvaluationRunSummary>> = useMemo(
    () => [
      {
        field: 'run_id',
        name: i18n.COLUMN_RUN_ID,
        sortable: true,
        truncateText: true,
        width: '200px',
        render: (runId: string) => (
          <EuiLink onClick={() => history.push(`/runs/${encodeURIComponent(runId)}`)}>
            {runId.slice(0, 12)}...
          </EuiLink>
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
            <span
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              role="presentation"
            >
              <EuiLink href={ci.build_url} target="_blank" external>
                {i18n.CI_BUILD_LINK}
              </EuiLink>
            </span>
          ) : (
            '-'
          ),
      },
      {
        field: 'ci',
        name: i18n.COLUMN_PULL_REQUEST,
        render: (ci: EvaluationRunSummary['ci']) => {
          const prRaw = ci?.pull_request;
          if (!prRaw) return '-';
          const prUrl = resolvePrUrl(prRaw);
          if (!prUrl) return '-';
          return (
            <span
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              role="presentation"
            >
              <EuiLink href={prUrl} target="_blank" external>
                {i18n.PR_LINK}
              </EuiLink>
            </span>
          );
        },
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

  const hasSelection = selectedRuns.length > 0;
  const lockedSuiteId = hasSelection ? selectedRuns[0].suite_id : undefined;
  const selectedRunIds = useMemo(() => new Set(selectedRuns.map((r) => r.run_id)), [selectedRuns]);
  const selectionFull = selectedRuns.length >= 2;

  const selection: EuiTableSelectionType<EvaluationRunSummary> = useMemo(
    () => ({
      onSelectionChange: (items: EvaluationRunSummary[]) => setSelectedRuns(items),
      selectable: (run: EvaluationRunSummary) => {
        if (selectedRunIds.has(run.run_id)) return true;
        if (selectionFull) return false;
        return !hasSelection || run.suite_id === lockedSuiteId;
      },
      selectableMessage: (selectable: boolean, run: EvaluationRunSummary) => {
        if (selectable) return '';
        if (selectionFull && !selectedRunIds.has(run.run_id)) return i18n.COMPARE_MAX_SELECTED_HINT;
        return i18n.COMPARE_DIFFERENT_SUITE_HINT;
      },
    }),
    [hasSelection, lockedSuiteId, selectedRunIds, selectionFull]
  );

  const totalRuns = data?.total ?? 0;
  const showCompareControls = totalRuns >= 2;
  const canCompare = selectedRuns.length === 2;

  const handleCompare = useCallback(() => {
    if (!canCompare) return;
    const [runA, runB] = selectedRuns;
    history.push(
      `/compare?runA=${encodeURIComponent(runA.run_id)}&runB=${encodeURIComponent(runB.run_id)}`
    );
  }, [canCompare, selectedRuns, history]);

  return (
    <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFieldSearch
            placeholder={i18n.SEARCH_PLACEHOLDER}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPageIndex(0);
              setSelectedRuns([]);
            }}
            isClearable
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ minWidth: 280 }}>
          <EuiSelect
            aria-label={i18n.SUITE_FILTER_ARIA_LABEL}
            options={suiteOptions}
            value={suiteIdFilter}
            onChange={(event) => {
              setSuiteIdFilter(event.target.value);
              setPageIndex(0);
              setSelectedRuns([]);
            }}
          />
        </EuiFlexItem>
        {showCompareControls && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={canCompare ? undefined : i18n.COMPARE_SELECTION_HINT}
              position="top"
            >
              <EuiButton iconType="diff" onClick={handleCompare} isDisabled={!canCompare} size="m">
                {i18n.COMPARE_SELECTED_BUTTON}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {error ? (
        <EuiEmptyPrompt
          color="danger"
          iconType="warning"
          title={<h2>{i18n.LOAD_ERROR_TITLE}</h2>}
          body={<p>{i18n.getLoadErrorBody(String(error))}</p>}
          actions={[
            <EuiButton onClick={() => refetch()} iconType="refresh">
              {i18n.RETRY_BUTTON}
            </EuiButton>,
          ]}
        />
      ) : (
        <EuiBasicTable<EvaluationRunSummary>
          tableCaption={i18n.TABLE_CAPTION}
          items={data?.runs ?? []}
          itemId="run_id"
          columns={columns}
          loading={isLoading}
          pagination={pagination}
          onChange={onTableChange}
          selection={showCompareControls ? selection : undefined}
          rowProps={(item) => ({
            onClick: (e: React.MouseEvent) => {
              const target = e.target as HTMLElement;
              if (target.closest('.euiTableRowCellCheckbox, .euiLink, a')) return;
              history.push(`/runs/${encodeURIComponent(item.run_id)}`);
            },
            style: { cursor: 'pointer' },
          })}
        />
      )}
    </EuiPageSection>
  );
};
