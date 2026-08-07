/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, type MouseEvent } from 'react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiButton,
  EuiLink,
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiFlexItem,
  EuiPageSection,
  EuiStat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiToolTip,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutResizable,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { EvaluatorStats } from '@kbn/evals-common';
import { TraceWaterfall, useTraceSpans } from '@kbn/llm-trace-waterfall';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import {
  useDatasets,
  useEvaluationExperiment,
  useEvalsTraceFetcher,
  useExperimentDatasetExamples,
} from '../../hooks/use_evals_api';
import type {
  LaunchedExperimentConfig,
  RunExperimentRequest,
} from '../../../common/experiments/run_experiment';
import { useWorkflowExecutions } from '../../hooks/use_experiments_api';
import { ExampleScoresTable } from '../../components/example_scores_table';
import { WorkflowRunProgress } from '../../components/workflow_run_progress';
import { LaunchedConfigSummary } from '../../components/launched_config_summary';
import { SaveAsWorkflowButton } from '../../components/save_as_workflow_button';
import { resolvePrUrl } from '../../utils/pr_url';
import * as i18n from './translations';

interface DatasetStatsGroup {
  datasetId: string;
  datasetName: string;
  exampleCount: number;
  stats: EvaluatorStats[];
}

// Poll cadence for a live run, shared by the aggregate stats and the per-dataset example rows so
// both refresh in lockstep.
const RUN_POLL_INTERVAL_MS = 3000;

interface DatasetStatsAccordionProps {
  experimentId: string;
  executionId?: string;
  group: DatasetStatsGroup;
  statsColumns: Array<EuiBasicTableColumn<EvaluatorStats>>;
  experimentLoading: boolean;
  isOpen: boolean;
  isRunning: boolean;
  datasetExists: boolean;
  selectedExampleId?: string | null;
  onTraceClick: (traceId: string, exampleId: string) => void;
  onDatasetToggle: (datasetId: string, isOpen: boolean) => void;
}

const DatasetStatsAccordion: React.FC<DatasetStatsAccordionProps> = ({
  experimentId,
  executionId,
  group,
  statsColumns,
  experimentLoading,
  isOpen,
  isRunning,
  datasetExists,
  selectedExampleId,
  onTraceClick,
  onDatasetToggle,
}) => {
  const history = useHistory();
  const {
    data: datasetExamples,
    isLoading: examplesLoading,
    error: examplesError,
    refetch: refetchExamples,
  } = useExperimentDatasetExamples(experimentId, isOpen ? group.datasetId : '', executionId, {
    refetchInterval: isRunning ? RUN_POLL_INTERVAL_MS : false,
    staleTime: isRunning ? 0 : undefined,
  });

  // When the run settles and polling stops, pull the final example set once in case the last poll
  // fired just before the last example's scores were indexed.
  const wasRunningRef = useRef(isRunning);
  useEffect(() => {
    if (wasRunningRef.current && !isRunning && isOpen) {
      refetchExamples();
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, isOpen, refetchExamples]);

  return (
    <>
      <EuiAccordion
        id={`experimentDatasetAccordion-${group.datasetId}`}
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <h4>
                  {datasetExists ? (
                    <EuiLink
                      {...reactRouterNavigate(
                        history,
                        `/datasets/${group.datasetId}`,
                        (event: MouseEvent<HTMLAnchorElement>) => event.stopPropagation()
                      )}
                    >
                      {group.datasetName}
                    </EuiLink>
                  ) : (
                    <EuiToolTip content={i18n.DELETED_DATASET_TOOLTIP}>
                      <span tabIndex={0}>
                        {group.datasetName}{' '}
                        <EuiTextColor color="subdued">{i18n.DELETED_DATASET_SUFFIX}</EuiTextColor>
                      </span>
                    </EuiToolTip>
                  )}
                </h4>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.getExampleCountLabel(group.exampleCount)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={(nextIsOpen) => onDatasetToggle(group.datasetId, nextIsOpen)}
      >
        <EuiSpacer size="m" />
        <EuiText size="s">
          <h5>{i18n.SECTION_EXAMPLE_SCORES}</h5>
        </EuiText>
        <EuiSpacer size="s" />
        {examplesError ? (
          <EuiText color="danger" size="s">
            <p>{i18n.getExamplesLoadError(String(examplesError))}</p>
          </EuiText>
        ) : examplesLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          <ExampleScoresTable
            examples={datasetExamples?.examples ?? []}
            selectedExampleId={selectedExampleId}
            onTraceClick={onTraceClick}
          />
        )}
        <EuiSpacer size="m" />
        <EuiText size="s">
          <h5>{i18n.SECTION_EVALUATOR_STATS}</h5>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiBasicTable<EvaluatorStats>
          tableCaption={i18n.SECTION_EVALUATOR_STATS}
          items={group.stats}
          columns={statsColumns}
          loading={experimentLoading || (isOpen && examplesLoading)}
        />
      </EuiAccordion>
      <EuiSpacer size="l" />
    </>
  );
};

// Upper bound on datasets fetched solely to resolve which referenced datasets
// still exist (for the "(deleted)" label). Above this, existence is treated as
// undetermined and links are kept. A server-side existence flag is the proper
// long-term fix
const MAX_DATASETS_FOR_EXISTENCE_CHECK = 1000;

export const ExperimentDetailPage: React.FC = () => {
  const { experimentId } = useParams<{ experimentId: string }>();
  const history = useHistory();
  const location = useLocation();
  const { euiTheme } = useEuiTheme();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const executionId = searchParams.get('execution_id') ?? undefined;
  const workflowExecutionIds = useMemo(
    () => searchParams.getAll('workflow_execution_id'),
    [searchParams]
  );

  // While a launch is in flight the experiment document is created asynchronously
  // by the workflow (an experiment only exists once scores are ingested). A single
  // hook polls every launched execution and tells us whether the run has settled
  // and how many scores have landed so far.
  const isLaunching = workflowExecutionIds.length > 0;
  const {
    executions: workflowExecutions,
    allSettled: runSettled,
    scoresIngested,
  } = useWorkflowExecutions(workflowExecutionIds);
  const anyScoresIngested = scoresIngested > 0;
  const runInProgress = isLaunching && !runSettled;

  // The submitted form, forwarded via router state on "Run now", so the config
  // stays visible while the run has not produced queryable results yet.
  const launchedConfig = useMemo(
    () =>
      (location.state as { experimentConfig?: LaunchedExperimentConfig } | null)?.experimentConfig,
    [location.state]
  );

  const launchedRequest = useMemo(
    () =>
      (location.state as { experimentRequest?: RunExperimentRequest } | null)?.experimentRequest,
    [location.state]
  );

  const {
    data: experimentDetail,
    isLoading: experimentLoading,
    error: experimentError,
    refetch: refetchExperiment,
  } = useEvaluationExperiment(experimentId, executionId, {
    refetchInterval: runInProgress ? RUN_POLL_INTERVAL_MS : false,
    enabled: !isLaunching || anyScoresIngested,
  });

  // Fetch the experiment as soon as scores appear, and once more when the run
  // settles, without waiting for the next poll tick.
  useEffect(() => {
    if (isLaunching && (anyScoresIngested || runSettled)) {
      refetchExperiment();
    }
  }, [isLaunching, anyScoresIngested, runSettled, refetchExperiment]);

  const openDatasetId = searchParams.get('dataset_id');
  const selectedExampleId = searchParams.get('example_id');
  const selectedTraceId = searchParams.get('trace_id');
  const fetchTrace = useEvalsTraceFetcher();
  const {
    spans,
    durationMs,
    isLoading: traceLoading,
    error: traceError,
  } = useTraceSpans(selectedTraceId, { fetchTrace });
  const prUrl = useMemo(() => {
    const pr = experimentDetail?.ci?.pull_request;
    return pr ? resolvePrUrl(pr) : null;
  }, [experimentDetail?.ci?.pull_request]);

  const experimentName = experimentDetail?.experiment_name ?? launchedConfig?.name;
  const suiteId = experimentDetail?.suite_id;

  const pageTitle = suiteId
    ? i18n.getRunPageTitle(suiteId)
    : experimentName
    ? i18n.getPageTitleWithName(experimentName)
    : i18n.getPageTitle(experimentId);

  const updateSearchParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(location.search);
      updater(next);
      const search = next.toString();
      history.push({
        pathname: location.pathname,
        search: search ? `?${search}` : '',
        state: location.state,
      });
    },
    [history, location.pathname, location.search, location.state]
  );

  const setOpenDatasetId = useCallback(
    (datasetId: string | null) => {
      updateSearchParams((params) => {
        if (datasetId) {
          params.set('dataset_id', datasetId);
        } else {
          params.delete('dataset_id');
          params.delete('example_id');
          params.delete('trace_id');
        }
      });
    },
    [updateSearchParams]
  );

  const setSelectedTrace = useCallback(
    (traceId: string | null, exampleId?: string) => {
      updateSearchParams((params) => {
        if (traceId) {
          params.set('trace_id', traceId);
          if (exampleId) {
            params.set('example_id', exampleId);
          } else {
            params.delete('example_id');
          }
        } else {
          params.delete('trace_id');
          params.delete('example_id');
        }
      });
    },
    [updateSearchParams]
  );

  const { data: datasetsData } = useDatasets({ perPage: MAX_DATASETS_FOR_EXISTENCE_CHECK });

  // A null set means existence is undetermined (still loading, or there are more
  // datasets than we fetched), in which case we keep the link to avoid rendering
  // a false "(deleted)" label.
  const existingDatasetIds = useMemo(() => {
    if (!datasetsData || datasetsData.total > datasetsData.datasets.length) {
      return null;
    }
    return new Set(datasetsData.datasets.map((dataset) => dataset.id));
  }, [datasetsData]);

  const datasetStatsGroups = useMemo(() => {
    const groupedStats = new Map<string, DatasetStatsGroup>();

    for (const stat of experimentDetail?.stats ?? []) {
      const existingGroup = groupedStats.get(stat.dataset_id);
      if (existingGroup) {
        existingGroup.stats.push(stat);
        continue;
      }

      // example_count is identical for all evaluators in a dataset (comes from the outer
      // by_dataset cardinality bucket), so we only need to capture it from the first stat.
      groupedStats.set(stat.dataset_id, {
        datasetId: stat.dataset_id,
        datasetName: stat.dataset_name,
        exampleCount: stat.example_count,
        stats: [stat],
      });
    }

    return Array.from(groupedStats.values()).sort((a, b) =>
      a.datasetName.localeCompare(b.datasetName)
    );
  }, [experimentDetail?.stats]);

  // Live progress derived from the scores already aggregated in Elasticsearch —
  // the same source the results table streams from. The workflow step's own
  // counters advance only per batch (and read 0 during a single in-flight batch),
  // so we use these to floor the run-progress line and keep it consistent with
  // the results shown below it.
  const streamedProgress = useMemo(() => {
    const stats = experimentDetail?.stats;
    if (!stats || stats.length === 0) {
      return undefined;
    }
    const esScoresIngested = stats.reduce((sum, stat) => sum + (stat.stats.count ?? 0), 0);
    const exampleCountByDataset = new Map<string, number>();
    for (const stat of stats) {
      if (!exampleCountByDataset.has(stat.dataset_id)) {
        exampleCountByDataset.set(stat.dataset_id, stat.example_count ?? 0);
      }
    }
    const esExamplesDone = Array.from(exampleCountByDataset.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    return { scoresIngested: esScoresIngested, examplesDone: esExamplesDone };
  }, [experimentDetail?.stats]);

  const statsColumns: Array<EuiBasicTableColumn<EvaluatorStats>> = useMemo(
    () => [
      {
        field: 'evaluator_name',
        name: i18n.COLUMN_EVALUATOR,
        sortable: true,
        render: (name: string) => (
          <EuiText size="s">
            <strong>{name}</strong>
          </EuiText>
        ),
      },
      {
        field: 'stats.mean',
        name: i18n.COLUMN_MEAN,
        sortable: true,
        render: (value: number) => value.toFixed(2),
      },
      {
        field: 'stats.median',
        name: i18n.COLUMN_MEDIAN,
        render: (value: number) => value.toFixed(2),
      },
      {
        field: 'stats.std_dev',
        name: i18n.COLUMN_STD_DEV,
        render: (value: number) => value.toFixed(2),
      },
      {
        field: 'stats.min',
        name: i18n.COLUMN_MIN,
        render: (value: number) => value.toFixed(2),
      },
      {
        field: 'stats.max',
        name: i18n.COLUMN_MAX,
        render: (value: number) => value.toFixed(2),
      },
    ],
    []
  );

  if (experimentLoading && !isLaunching) {
    return (
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiLoadingSpinner size="xl" />
      </EuiPageSection>
    );
  }

  const isNotFound = isHttpFetchError(experimentError) && experimentError.response?.status === 404;
  const showLaunchView = isLaunching && !experimentDetail;

  if (experimentError && !showLaunchView) {
    return (
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiEmptyPrompt
          color={isNotFound ? 'subdued' : 'danger'}
          iconType={isNotFound ? 'search' : 'warning'}
          title={
            <h2>
              {isNotFound ? i18n.EXPERIMENT_NOT_FOUND_TITLE : i18n.EXPERIMENT_LOAD_ERROR_TITLE}
            </h2>
          }
          body={
            <p>
              {isNotFound
                ? i18n.getExperimentNotFoundBody(experimentId)
                : i18n.getExperimentLoadErrorBody(String(experimentError))}
            </p>
          }
          actions={[
            <EuiButton onClick={() => history.push('/')}>{i18n.BACK_TO_EXPERIMENTS}</EuiButton>,
          ]}
        />
      </EuiPageSection>
    );
  }

  return (
    <>
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiTitle size="m">
          <h2>{pageTitle}</h2>
        </EuiTitle>
        <EuiSpacer size="l" />

        {/* While launching, stand in for the not-yet-existent experiment document.
        Dropped once the real detail loads so it doesn't duplicate the stat cards below. */}
        {showLaunchView && launchedConfig && (
          <>
            <LaunchedConfigSummary config={launchedConfig} />
            <EuiSpacer size="l" />
          </>
        )}

        {experimentDetail && (
          <>
            <EuiFlexGroup wrap>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={experimentDetail.task_model?.id ?? '-'}
                    description={i18n.STAT_TASK_MODEL}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={experimentDetail.evaluator_model?.id ?? '-'}
                    description={i18n.STAT_EVALUATOR_MODEL}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={String(experimentDetail.total_repetitions ?? '-')}
                    description={i18n.STAT_REPETITIONS}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={
                      experimentDetail.git_branch ? (
                        <EuiBadge color="hollow">{experimentDetail.git_branch}</EuiBadge>
                      ) : (
                        '-'
                      )
                    }
                    description={i18n.STAT_BRANCH}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={
                      experimentDetail.ci?.build_url ? (
                        <EuiLink href={experimentDetail.ci.build_url} target="_blank" external>
                          {i18n.CI_BUILD_LINK}
                        </EuiLink>
                      ) : (
                        '-'
                      )
                    }
                    description={i18n.STAT_CI}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiStat
                    title={
                      prUrl ? (
                        <EuiLink href={prUrl} target="_blank" external>
                          {i18n.PR_LINK}
                        </EuiLink>
                      ) : (
                        '-'
                      )
                    }
                    description={i18n.STAT_PULL_REQUEST}
                    titleSize="xs"
                  />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </>
        )}

        {isLaunching && (
          <>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <h3>{i18n.SECTION_RUN_PROGRESS}</h3>
                </EuiText>
              </EuiFlexItem>
              {runSettled && launchedRequest && (
                <EuiFlexItem grow={false}>
                  <SaveAsWorkflowButton request={launchedRequest} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <WorkflowRunProgress executions={workflowExecutions} progressFloor={streamedProgress} />
            <EuiSpacer size="l" />
          </>
        )}

        {showLaunchView ? (
          runSettled && !anyScoresIngested ? (
            <EuiEmptyPrompt
              color="warning"
              iconType="warning"
              title={<h2>{i18n.EXPERIMENT_NO_RESULTS_TITLE}</h2>}
              body={<p>{i18n.EXPERIMENT_NO_RESULTS_BODY}</p>}
              actions={[
                <EuiButton onClick={() => history.push('/')}>{i18n.BACK_TO_EXPERIMENTS}</EuiButton>,
              ]}
            />
          ) : anyScoresIngested ? (
            // Scores landed but the experiment document isn't fetched yet
            <EuiEmptyPrompt
              color="subdued"
              icon={<EuiLoadingSpinner size="xl" />}
              title={<h2>{i18n.EXPERIMENT_LOADING_RESULTS_TITLE}</h2>}
              body={<p>{i18n.EXPERIMENT_LOADING_RESULTS_BODY}</p>}
            />
          ) : (
            <EuiEmptyPrompt
              color="subdued"
              icon={<EuiLoadingSpinner size="xl" />}
              title={<h2>{i18n.EXPERIMENT_PREPARING_TITLE}</h2>}
              body={<p>{i18n.EXPERIMENT_PREPARING_BODY}</p>}
            />
          )
        ) : (
          experimentDetail && (
            <>
              <EuiText size="s">
                <h3>{i18n.SECTION_DATASETS}</h3>
              </EuiText>
              <EuiSpacer size="m" />
              {datasetStatsGroups.map((group) => (
                <DatasetStatsAccordion
                  key={group.datasetId}
                  experimentId={experimentId}
                  executionId={executionId}
                  group={group}
                  statsColumns={statsColumns}
                  experimentLoading={experimentLoading}
                  isOpen={openDatasetId === group.datasetId}
                  isRunning={runInProgress}
                  datasetExists={
                    existingDatasetIds ? existingDatasetIds.has(group.datasetId) : true
                  }
                  selectedExampleId={openDatasetId === group.datasetId ? selectedExampleId : null}
                  onTraceClick={(traceId, exampleId) => setSelectedTrace(traceId, exampleId)}
                  onDatasetToggle={(targetDatasetId, nextIsOpen) =>
                    setOpenDatasetId(nextIsOpen ? targetDatasetId : null)
                  }
                />
              ))}
            </>
          )
        )}
      </EuiPageSection>

      {selectedTraceId && (
        <EuiFlyoutResizable
          ownFocus
          onClose={() => setSelectedTrace(null)}
          size="l"
          minWidth={480}
          maxWidth={1600}
          aria-labelledby="traceWaterfallTitle"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id="traceWaterfallTitle" style={{ wordBreak: 'break-all' }}>
                {i18n.getTraceFlyoutTitle(selectedTraceId)}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody
            className={css`
              .euiFlyoutBody__overflowContent {
                height: 100%;
                padding: 0;
              }
              .euiFlyoutBody__overflow {
                overflow: hidden;
              }
            `}
          >
            <div style={{ height: '100%', padding: 16 }}>
              <TraceWaterfall
                spans={spans}
                traceId={selectedTraceId}
                durationMs={durationMs}
                isLoading={traceLoading}
                error={traceError}
              />
            </div>
          </EuiFlyoutBody>
        </EuiFlyoutResizable>
      )}
    </>
  );
};
