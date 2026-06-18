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
import type { EvaluationExperimentSummary } from '@kbn/evals-common';
import { useEvaluationExperiments } from '../../hooks/use_evals_api';
import { resolvePrUrl } from '../../utils/pr_url';
import * as i18n from './translations';

export const ExperimentsListPage: React.FC = () => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [suiteIdFilter, setSuiteIdFilter] = useState('');
  const [selectedExperiments, setSelectedExperiments] = useState<EvaluationExperimentSummary[]>([]);

  const { data, isLoading, error, refetch } = useEvaluationExperiments({
    page: pageIndex + 1,
    perPage: pageSize,
    branch: searchText || undefined,
    suiteId: suiteIdFilter || undefined,
  });

  const { data: suiteFilterData } = useEvaluationExperiments({
    page: 1,
    perPage: 100,
    branch: searchText || undefined,
  });

  const suiteOptions = useMemo(() => {
    const options = [{ value: '', text: i18n.SUITE_FILTER_ALL_OPTION }];
    const suiteSet = new Set<string>();

    for (const experiment of suiteFilterData?.experiments ?? []) {
      if (experiment.suite_id) {
        suiteSet.add(experiment.suite_id);
      }
    }

    for (const id of Array.from(suiteSet).sort()) {
      options.push({ value: id, text: id });
    }

    return options;
  }, [suiteFilterData?.experiments]);

  const navigateToDetail = useCallback(
    (item: EvaluationExperimentSummary) => {
      const executionId = item.execution_id ?? item.experiment_id;
      const expPath = encodeURIComponent(item.experiment_id);
      const brParam = encodeURIComponent(executionId);
      history.push(`/experiments/${expPath}?execution_id=${brParam}`);
    },
    [history]
  );

  const columns: Array<EuiBasicTableColumn<EvaluationExperimentSummary>> = useMemo(
    () => [
      {
        field: 'experiment_name',
        name: i18n.COLUMN_NAME,
        sortable: true,
        truncateText: true,
        width: '200px',
        render: (_name: string | null | undefined, item: EvaluationExperimentSummary) => {
          const isSuiteRun = !!item.suite_id;
          const displayName = isSuiteRun
            ? item.suite_id ?? item.experiment_name ?? item.experiment_id.slice(0, 12)
            : item.experiment_name ?? item.experiment_id.slice(0, 12);
          const tooltipId = item.execution_id ?? item.experiment_id;
          const link = <EuiLink onClick={() => navigateToDetail(item)}>{displayName}</EuiLink>;
          return <EuiToolTip content={tooltipId}>{link}</EuiToolTip>;
        },
      },
      {
        field: 'experiment_count',
        name: i18n.COLUMN_EXPERIMENTS,
        width: '150px',
        render: (count: number | undefined, item: EvaluationExperimentSummary) => {
          const c = count ?? 1;
          if (c > 1 || !!item.suite_id) {
            return (
              <EuiBadge color="hollow">
                {c} {i18n.getExperimentsBadge(c)}
              </EuiBadge>
            );
          }
          return '-';
        },
      },
      {
        field: 'timestamp',
        name: i18n.COLUMN_TIMESTAMP,
        sortable: true,
        render: (timestamp: string) => (timestamp ? new Date(timestamp).toLocaleString() : '-'),
      },
      {
        field: 'task_model',
        name: i18n.COLUMN_TASK_MODEL,
        render: (model: EvaluationExperimentSummary['task_model']) =>
          model ? <EuiBadge color="primary">{model.id}</EuiBadge> : '-',
      },
      {
        field: 'evaluator_model',
        name: i18n.COLUMN_EVALUATOR_MODEL,
        render: (model: EvaluationExperimentSummary['evaluator_model']) =>
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
        render: (ci: EvaluationExperimentSummary['ci']) =>
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
        render: (ci: EvaluationExperimentSummary['ci']) => {
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
    [navigateToDetail]
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 25, 50],
  };

  const onTableChange = ({ page }: CriteriaWithPagination<EvaluationExperimentSummary>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const hasSelection = selectedExperiments.length > 0;
  const lockedSuiteId = hasSelection ? selectedExperiments[0].suite_id : undefined;
  const selectedExecutionIds = useMemo(
    () => new Set(selectedExperiments.map((r) => r.execution_id ?? r.experiment_id)),
    [selectedExperiments]
  );
  const selectionFull = selectedExperiments.length >= 2;

  const selection: EuiTableSelectionType<EvaluationExperimentSummary> = useMemo(
    () => ({
      onSelectionChange: (items: EvaluationExperimentSummary[]) => setSelectedExperiments(items),
      selectable: (experiment: EvaluationExperimentSummary) => {
        const executionId = experiment.execution_id ?? experiment.experiment_id;
        if (selectedExecutionIds.has(executionId)) return true;
        if (selectionFull) return false;
        if (!hasSelection) return true;
        return experiment.suite_id === lockedSuiteId;
      },
      selectableMessage: (selectable: boolean, experiment: EvaluationExperimentSummary) => {
        if (selectable) return '';
        const executionId = experiment.execution_id ?? experiment.experiment_id;
        if (selectionFull && !selectedExecutionIds.has(executionId))
          return i18n.COMPARE_MAX_SELECTED_HINT;
        return i18n.COMPARE_DIFFERENT_SUITE_HINT;
      },
    }),
    [hasSelection, lockedSuiteId, selectedExecutionIds, selectionFull]
  );

  const totalExperiments = data?.total ?? 0;
  const showCompareControls = totalExperiments >= 2;
  const canCompare = selectedExperiments.length === 2;

  const handleCompare = useCallback(() => {
    if (!canCompare) return;
    const [a, b] = selectedExperiments;
    const isSuiteRun = !!a.suite_id || !!b.suite_id;
    const type = isSuiteRun ? 'execution' : 'experiment';
    const baselineId = isSuiteRun ? a.execution_id ?? a.experiment_id : a.experiment_id;
    const targetId = isSuiteRun ? b.execution_id ?? b.experiment_id : b.experiment_id;
    const params = new URLSearchParams({ type, baseline: baselineId, target: targetId });

    history.push(`/compare?${params.toString()}`);
  }, [canCompare, selectedExperiments, history]);

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
              setSelectedExperiments([]);
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
              setSelectedExperiments([]);
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
        <EuiBasicTable<EvaluationExperimentSummary>
          tableCaption={i18n.TABLE_CAPTION}
          items={data?.experiments ?? []}
          itemId="execution_id"
          columns={columns}
          loading={isLoading}
          pagination={pagination}
          onChange={onTableChange}
          selection={showCompareControls ? selection : undefined}
          rowProps={(item) => ({
            onClick: (e: React.MouseEvent) => {
              const target = e.target as HTMLElement;
              if (target.closest('.euiTableRowCellCheckbox, .euiLink, a')) return;
              navigateToDetail(item);
            },
            style: { cursor: 'pointer' },
          })}
        />
      )}
    </EuiPageSection>
  );
};
