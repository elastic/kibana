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
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiPageSection,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
  EuiToolTip,
  copyToClipboard,
  useEuiTheme,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
  type EuiTableSelectionType,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { EvaluationExperimentSummary } from '@kbn/evals-common';
import { useEvaluationExperiments } from '../../hooks/use_evals_api';
import { NewExperimentFlyout } from '../../components/new_experiment_flyout/new_experiment_flyout';
import { resolvePrUrl } from '../../utils/pr_url';
import { CopyableDetail } from './copyable_detail';
import { LinkDetail } from './link_detail';
import * as i18n from './translations';

const ExperimentRowDetails: React.FC<{ item: EvaluationExperimentSummary }> = ({ item }) => {
  const { services } = useKibana();
  const toasts = services.notifications?.toasts;
  const [isOpen, setIsOpen] = useState(false);

  // experiment_id === execution_id (the grouping key). Multi-experiment rows are
  // labeled "Execution ID" (an experiment id would mislead); single rows are one.
  const runId = item.execution_id ?? item.experiment_id;
  const isMultiExperiment = (item.experiment_count ?? 1) > 1;
  const idLabel = isMultiExperiment ? i18n.DETAIL_EXECUTION_ID : i18n.DETAIL_EXPERIMENT_ID;

  const branch = item.git_branch ?? undefined;
  const prRaw = item.ci?.pull_request?.trim();
  const prUrl = prRaw ? resolvePrUrl(prRaw) : null;
  const prText = prRaw && /^\d+$/.test(prRaw) ? `#${prRaw}` : i18n.DETAIL_VIEW_LINK;
  const buildUrl = item.ci?.build_url ?? undefined;

  const copy = (value: string) => {
    copyToClipboard(value);
    toasts?.addSuccess(i18n.COPIED_TO_CLIPBOARD);
  };

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="leftCenter"
      aria-label={i18n.ROW_DETAILS_ARIA}
      button={
        <EuiToolTip content={i18n.ROW_DETAILS_ARIA} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="boxesHorizontal"
            color="text"
            aria-label={i18n.ROW_DETAILS_ARIA}
            onClick={(event: React.MouseEvent) => {
              // The row itself navigates on click; don't let the toggle bubble.
              event.stopPropagation();
              setIsOpen((open) => !open);
            }}
            data-test-subj="evalsRowActionsButton"
          />
        </EuiToolTip>
      }
    >
      <div
        css={{ width: 300 }}
        role="presentation"
        onClick={(event: React.MouseEvent) => event.stopPropagation()}
        onKeyDown={(event: React.KeyboardEvent) => event.stopPropagation()}
        data-test-subj="evalsRowDetailsPanel"
      >
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <CopyableDetail
              label={idLabel}
              value={runId}
              onCopy={copy}
              dataTestSubj="evalsRowCopyRunId"
            />
          </EuiFlexItem>
          {branch && (
            <EuiFlexItem grow={false}>
              <CopyableDetail
                label={i18n.DETAIL_BRANCH}
                value={branch}
                onCopy={copy}
                dataTestSubj="evalsRowCopyBranch"
              />
            </EuiFlexItem>
          )}
          {prUrl && (
            <EuiFlexItem grow={false}>
              <LinkDetail
                label={i18n.DETAIL_PULL_REQUEST}
                href={prUrl}
                text={prText}
                dataTestSubj="evalsRowViewPr"
              />
            </EuiFlexItem>
          )}
          {buildUrl && (
            <EuiFlexItem grow={false}>
              <LinkDetail
                label={i18n.DETAIL_CI_BUILD}
                href={buildUrl}
                text={i18n.DETAIL_VIEW_LINK}
                dataTestSubj="evalsRowViewBuild"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};

export const ExperimentsListPage: React.FC = () => {
  const history = useHistory();
  const { services } = useKibana();
  const { euiTheme } = useEuiTheme();
  const savedWorkflowsHref = services.http?.basePath.prepend(
    '/app/workflows?tags=evals-experiment'
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [suiteIdFilter, setSuiteIdFilter] = useState('');
  const [selectedExperiments, setSelectedExperiments] = useState<EvaluationExperimentSummary[]>([]);
  const [isNewExperimentOpen, setIsNewExperimentOpen] = useState(false);

  const { data, isLoading, error, refetch } = useEvaluationExperiments({
    page: pageIndex + 1,
    perPage: pageSize,
    search: searchText || undefined,
    suiteId: suiteIdFilter || undefined,
  });

  const { data: suiteFilterData } = useEvaluationExperiments({
    page: 1,
    perPage: 100,
    search: searchText || undefined,
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
          const detailHref = history.createHref({
            pathname: `/experiments/${encodeURIComponent(item.experiment_id)}`,
            search: `?execution_id=${encodeURIComponent(tooltipId)}`,
          });
          const link = (
            <EuiLink
              href={detailHref}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) {
                  return;
                }
                event.preventDefault();
                navigateToDetail(item);
              }}
            >
              {displayName}
            </EuiLink>
          );
          return <EuiToolTip content={tooltipId}>{link}</EuiToolTip>;
        },
      },
      {
        field: 'experiment_count',
        name: i18n.COLUMN_EXPERIMENTS,
        width: '150px',
        render: (count: number | undefined) => {
          const c = count ?? 1;
          return (
            <EuiBadge color="hollow">
              {c} {i18n.getExperimentsBadge(c)}
            </EuiBadge>
          );
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
        field: 'total_repetitions',
        name: i18n.COLUMN_REPS,
        width: '60px',
      },
      {
        name: '',
        width: '48px',
        align: 'right',
        render: (item: EvaluationExperimentSummary) => <ExperimentRowDetails item={item} />,
      },
    ],
    [navigateToDetail, history]
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
    // Rows are aggregated by execution id, so always compare execution-vs-execution;
    // the row's `experiment_id` isn't on the score docs and would filter to a 404.
    const baselineId = a.execution_id ?? a.experiment_id;
    const targetId = b.execution_id ?? b.experiment_id;
    const params = new URLSearchParams({
      type: 'execution',
      baseline: baselineId,
      target: targetId,
    });

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
        {savedWorkflowsHref && (
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="popout"
              size="m"
              href={savedWorkflowsHref}
              data-test-subj="evalsViewExperimentWorkflowsButton"
            >
              {i18n.VIEW_EXPERIMENT_WORKFLOWS_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="plusInCircle"
            size="m"
            onClick={() => setIsNewExperimentOpen(true)}
            data-test-subj="evalsNewExperimentButton"
          >
            {i18n.NEW_EXPERIMENT_BUTTON}
          </EuiButton>
        </EuiFlexItem>
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
          itemId={(item) => item.execution_id ?? item.experiment_id}
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
      {isNewExperimentOpen && <NewExperimentFlyout onClose={() => setIsNewExperimentOpen(false)} />}
    </EuiPageSection>
  );
};
