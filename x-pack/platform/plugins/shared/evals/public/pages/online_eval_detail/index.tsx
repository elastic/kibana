/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiSwitch,
  useEuiTheme,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  EVALS_ONLINE_SCORES_URL,
  type ListOnlineScoresResponse,
} from '@kbn/evals-common';
import { LensConfigBuilder, type LensApiConfig } from '@kbn/lens-embeddable-utils';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { useParams, useHistory } from 'react-router-dom';
import { TraceWaterfall, useTraceSpans } from '@kbn/llm-trace-waterfall';
import { useEvalsTraceFetcher } from '../../hooks/use_evals_api';
import {
  useDeleteOnlineEvalWorkflow,
  useOnlineEvalWorkflow,
  useToggleOnlineEvalWorkflow,
} from '../../hooks/use_online_eval_workflows';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';

const SCORES_PER_PAGE = 25;
const ONLINE_SCORES_DATA_VIEW = '.evaluation-online-scores';
const ONLINE_SCORES_TIME_FIELD = '@timestamp';
const EMPTY_TIME_RANGE = {
  from: 'now-90d',
  to: 'now',
} as const;

type OnlineScoreRow = ListOnlineScoresResponse['data'][number];

const getMonitorFilterExpression = (monitorId: string): string => {
  const escaped = monitorId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `monitor.id: "${escaped}"`;
};

const buildAverageScoreByNameLensConfig = ({
  dataViewId,
  monitorId,
}: {
  dataViewId: string;
  monitorId: string;
}) =>
  ({
    type: 'xy',
    title: i18n.translate('xpack.evals.onlineEvaluations.detail.avgScoresPanelTitle', {
      defaultMessage: 'Average score by metric',
    }),
    query: {
      language: 'kql',
      expression: getMonitorFilterExpression(monitorId),
    },
    layers: [
      {
        type: 'line',
        data_source: {
          type: 'data_view_reference',
          ref_id: dataViewId,
        },
        sampling: 1,
        ignore_global_filters: false,
        x: {
          operation: 'date_histogram',
          field: ONLINE_SCORES_TIME_FIELD,
          suggested_interval: 'auto',
          use_original_time_range: false,
          include_empty_rows: true,
          drop_partial_intervals: false,
        },
        y: [
          {
            operation: 'average',
            field: 'score.value',
            label: i18n.translate('xpack.evals.onlineEvaluations.detail.avgScoreSeriesLabel', {
              defaultMessage: 'Average score',
            }),
          },
        ],
        breakdown_by: {
          operation: 'terms',
          fields: ['score.name'],
          limit: 10,
        },
      },
    ],
  } satisfies LensApiConfig);

const buildScoreCountByLabelLensConfig = ({
  dataViewId,
  monitorId,
}: {
  dataViewId: string;
  monitorId: string;
}) =>
  ({
    type: 'xy',
    title: i18n.translate('xpack.evals.onlineEvaluations.detail.scoreLabelsPanelTitle', {
      defaultMessage: 'Score label counts over time',
    }),
    query: {
      language: 'kql',
      expression: getMonitorFilterExpression(monitorId),
    },
    layers: [
      {
        type: 'bar_stacked',
        data_source: {
          type: 'data_view_reference',
          ref_id: dataViewId,
        },
        sampling: 1,
        ignore_global_filters: false,
        x: {
          operation: 'date_histogram',
          field: ONLINE_SCORES_TIME_FIELD,
          suggested_interval: 'auto',
          use_original_time_range: false,
          include_empty_rows: true,
          drop_partial_intervals: false,
        },
        y: [
          {
            operation: 'count',
            label: i18n.translate('xpack.evals.onlineEvaluations.detail.scoreCountSeriesLabel', {
              defaultMessage: 'Scores',
            }),
            empty_as_null: false,
          },
        ],
        breakdown_by: {
          operation: 'terms',
          fields: ['score.label'],
          limit: 10,
        },
      },
    ],
  } satisfies LensApiConfig);

export const OnlineEvalDetailPage: React.FC = () => {
  const history = useHistory();
  const { workflowId } = useParams<{ workflowId: string }>();
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana<{
    http: HttpStart;
    dataViews: DataViewsPublicPluginStart;
    lens: LensPublicStart;
  }>();
  const { canManage } = useEvalsPermissions();
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, JSX.Element>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDataViewLoading, setIsDataViewLoading] = useState(true);
  const [dataViewId, setDataViewId] = useState<string | null>(null);
  const [dataViewError, setDataViewError] = useState<Error | null>(null);
  const {
    data: workflow,
    isLoading: isWorkflowLoading,
    error: workflowError,
  } = useOnlineEvalWorkflow(workflowId);

  const fetchTrace = useEvalsTraceFetcher();
  const {
    spans,
    durationMs,
    isLoading: traceLoading,
    error: traceError,
  } = useTraceSpans(selectedTraceId, { fetchTrace });

  const toggleWorkflow = useToggleOnlineEvalWorkflow();
  const deleteWorkflow = useDeleteOnlineEvalWorkflow();
  const [scoresData, setScoresData] = useState<ListOnlineScoresResponse['data']>([]);
  const [scoresTotal, setScoresTotal] = useState(0);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [scoresError, setScoresError] = useState<Error | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const createDataView = async () => {
      setIsDataViewLoading(true);
      setDataViewError(null);
      try {
        const createdDataView = await services.dataViews.create({
          title: ONLINE_SCORES_DATA_VIEW,
          timeFieldName: ONLINE_SCORES_TIME_FIELD,
          allowHidden: true,
        });
        if (cancelled) {
          return;
        }
        setDataViewId(createdDataView.id ?? null);
      } catch (error) {
        if (!cancelled) {
          setDataViewError(error instanceof Error ? error : new Error(String(error)));
        }
      } finally {
        if (!cancelled) {
          setIsDataViewLoading(false);
        }
      }
    };

    createDataView();

    return () => {
      cancelled = true;
    };
  }, [services.dataViews]);

  React.useEffect(() => {
    let cancelled = false;

    const loadScores = async () => {
      setScoresLoading(true);
      setScoresError(null);
      try {
        const response = await services.http.get<ListOnlineScoresResponse>(
          EVALS_ONLINE_SCORES_URL,
          {
            query: {
              monitor_id: workflowId,
              page: pageIndex + 1,
              per_page: SCORES_PER_PAGE,
            },
            version: API_VERSIONS.internal.v1,
          }
        );
        if (cancelled) {
          return;
        }
        setScoresData(response.data);
        setScoresTotal(response.total);
      } catch (error) {
        if (!cancelled) {
          setScoresError(error instanceof Error ? error : new Error(String(error)));
        }
      } finally {
        if (!cancelled) {
          setScoresLoading(false);
        }
      }
    };

    loadScores();

    return () => {
      cancelled = true;
    };
  }, [services.http, workflowId, pageIndex]);

  const averageScoreAttributes = useMemo(() => {
    if (!dataViewId) {
      return null;
    }

    try {
      return new LensConfigBuilder(services.dataViews).fromAPIFormat(
        buildAverageScoreByNameLensConfig({ dataViewId, monitorId: workflowId })
      );
    } catch {
      return null;
    }
  }, [dataViewId, services.dataViews, workflowId]);

  const scoreCountAttributes = useMemo(() => {
    if (!dataViewId) {
      return null;
    }

    try {
      return new LensConfigBuilder(services.dataViews).fromAPIFormat(
        buildScoreCountByLabelLensConfig({ dataViewId, monitorId: workflowId })
      );
    } catch {
      return null;
    }
  }, [dataViewId, services.dataViews, workflowId]);

  const onTableChange = ({ page }: CriteriaWithPagination<OnlineScoreRow>) => {
    if (!page) {
      return;
    }
    setPageIndex(page.index);
  };

  const pagination = {
    pageIndex,
    pageSize: SCORES_PER_PAGE,
    totalItemCount: scoresTotal,
    pageSizeOptions: [SCORES_PER_PAGE],
    hidePerPageOptions: true,
  };

  const columns: Array<EuiBasicTableColumn<OnlineScoreRow>> = [
    {
      field: '@timestamp',
      name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.timeColumn', {
        defaultMessage: 'Time',
      }),
      width: '190px',
    },
    {
      field: 'trace_id',
      name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.traceIdColumn', {
        defaultMessage: 'Trace ID',
      }),
      render: (traceId: string) => (
        <EuiLink onClick={() => setSelectedTraceId(traceId)}>{traceId}</EuiLink>
      ),
    },
    {
      name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.evaluatorColumn', {
        defaultMessage: 'Evaluator',
      }),
      render: (item: OnlineScoreRow) => `${item.evaluator.name}@${item.evaluator.version}`,
    },
    {
      field: 'score.name',
      name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.scoreNameColumn', {
        defaultMessage: 'Score name',
      }),
    },
    {
      field: 'score.value',
      name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.valueColumn', {
        defaultMessage: 'Value',
      }),
    },
    {
      field: 'score.label',
      name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.labelColumn', {
        defaultMessage: 'Label',
      }),
      render: (label?: string) => label ?? '-',
    },
    {
      name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.explanationColumn', {
        defaultMessage: 'Explanation',
      }),
      width: '130px',
      align: 'right',
      render: (item: OnlineScoreRow) => {
        if (!item.score.explanation) {
          return '-';
        }

        const rowId = `${item.trace_id}-${item.evaluator.name}-${item.score.name}`;
        const isExpanded = rowId in expandedRows;
        return (
          <EuiButton
            size="s"
            iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
            onClick={() => {
              setExpandedRows((previous) => {
                if (rowId in previous) {
                  const { [rowId]: _removed, ...rest } = previous;
                  return rest;
                }

                return {
                  ...previous,
                  [rowId]: (
                    <EuiText size="s" data-test-subj={`onlineScoreExplanation-${rowId}`}>
                      <p>{item.score.explanation}</p>
                    </EuiText>
                  ),
                };
              });
            }}
          >
            {isExpanded
              ? i18n.translate(
                  'xpack.evals.onlineEvaluations.detail.scoresTable.hideExplanationButton',
                  {
                    defaultMessage: 'Hide',
                  }
                )
              : i18n.translate(
                  'xpack.evals.onlineEvaluations.detail.scoresTable.showExplanationButton',
                  {
                    defaultMessage: 'Show',
                  }
                )}
          </EuiButton>
        );
      },
    },
  ];

  if (isWorkflowLoading) {
    return (
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiText>
          <p>
            {i18n.translate('xpack.evals.onlineEvaluations.detail.loadingWorkflow', {
              defaultMessage: 'Loading online evaluation...',
            })}
          </p>
        </EuiText>
      </EuiPageSection>
    );
  }

  if (workflowError || !workflow) {
    return (
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiEmptyPrompt
          color="danger"
          iconType="warning"
          title={
            <h2>
              {i18n.translate('xpack.evals.onlineEvaluations.detail.workflowErrorTitle', {
                defaultMessage: 'Unable to load online evaluation',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.evals.onlineEvaluations.detail.workflowErrorBody', {
                defaultMessage: '{message}',
                values: { message: String(workflowError ?? 'Not found') },
              })}
            </p>
          }
        />
      </EuiPageSection>
    );
  }

  return (
    <>
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>{workflow.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label={i18n.translate('xpack.evals.onlineEvaluations.detail.enabledSwitchLabel', {
                    defaultMessage: 'Enabled',
                  })}
                  checked={workflow.enabled}
                  compressed
                  disabled={!canManage || toggleWorkflow.isLoading}
                  onChange={(event) =>
                    toggleWorkflow.mutate({
                      workflowId: workflow.id,
                      enabled: event.target.checked,
                    })
                  }
                  data-test-subj="onlineEvalDetailEnabledSwitch"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.evals.onlineEvaluations.detail.deleteButton.ariaLabel',
                    {
                      defaultMessage: 'Delete online evaluation',
                    }
                  )}
                  iconType="trash"
                  color="danger"
                  isDisabled={!canManage || deleteWorkflow.isLoading}
                  onClick={() => setIsDeleteModalOpen(true)}
                  data-test-subj="deleteOnlineEvalDetailButton"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiPanel hasBorder hasShadow={false} paddingSize="m">
              {isDataViewLoading ? (
                <EuiText size="s">
                  <p>
                    {i18n.translate('xpack.evals.onlineEvaluations.detail.loadingPanelDataView', {
                      defaultMessage: 'Preparing data view...',
                    })}
                  </p>
                </EuiText>
              ) : dataViewError || !averageScoreAttributes ? (
                <EuiEmptyPrompt
                  iconType="warning"
                  titleSize="xs"
                  title={
                    <h3>
                      {i18n.translate(
                        'xpack.evals.onlineEvaluations.detail.avgScoresLoadErrorTitle',
                        {
                          defaultMessage: 'Unable to render score trends',
                        }
                      )}
                    </h3>
                  }
                />
              ) : (
                <div data-test-subj="onlineEvalAverageScoreTrend">
                  <services.lens.EmbeddableComponent
                    id="online-evals-average-score-trend"
                    attributes={averageScoreAttributes}
                    timeRange={EMPTY_TIME_RANGE}
                    style={{ height: 280 }}
                  />
                </div>
              )}
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasBorder hasShadow={false} paddingSize="m">
              {isDataViewLoading ? (
                <EuiText size="s">
                  <p>
                    {i18n.translate('xpack.evals.onlineEvaluations.detail.loadingPanelLabels', {
                      defaultMessage: 'Preparing score labels panel...',
                    })}
                  </p>
                </EuiText>
              ) : dataViewError || !scoreCountAttributes ? (
                <EuiEmptyPrompt
                  iconType="warning"
                  titleSize="xs"
                  title={
                    <h3>
                      {i18n.translate(
                        'xpack.evals.onlineEvaluations.detail.scoreLabelsLoadErrorTitle',
                        {
                          defaultMessage: 'Unable to render score label counts',
                        }
                      )}
                    </h3>
                  }
                />
              ) : (
                <div data-test-subj="onlineEvalScoreLabelCounts">
                  <services.lens.EmbeddableComponent
                    id="online-evals-score-label-counts"
                    attributes={scoreCountAttributes}
                    timeRange={EMPTY_TIME_RANGE}
                    style={{ height: 280 }}
                  />
                </div>
              )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        {scoresError ? (
          <EuiEmptyPrompt
            color="danger"
            iconType="warning"
            title={
              <h3>
                {i18n.translate('xpack.evals.onlineEvaluations.detail.scoresLoadErrorTitle', {
                  defaultMessage: 'Unable to load recent scores',
                })}
              </h3>
            }
            body={
              <p>
                {i18n.translate('xpack.evals.onlineEvaluations.detail.scoresLoadErrorBody', {
                  defaultMessage: '{message}',
                  values: { message: String(scoresError) },
                })}
              </p>
            }
          />
        ) : (
          <EuiBasicTable<OnlineScoreRow>
            items={scoresData}
            columns={columns}
            loading={scoresLoading}
            pagination={pagination}
            onChange={onTableChange}
            tableCaption={i18n.translate(
              'xpack.evals.onlineEvaluations.detail.scoresTableCaption',
              {
                defaultMessage: 'Recent online evaluation scores',
              }
            )}
            itemId={(item) => `${item.trace_id}-${item.evaluator.name}-${item.score.name}`}
            itemIdToExpandedRowMap={expandedRows}
            data-test-subj="onlineEvalRecentScoresTable"
          />
        )}
      </EuiPageSection>
      {isDeleteModalOpen ? (
        <EuiConfirmModal
          title={i18n.translate('xpack.evals.onlineEvaluations.detail.deleteModalTitle', {
            defaultMessage: 'Delete online evaluation',
          })}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={() => {
            deleteWorkflow.mutate(
              { workflowId: workflow.id },
              {
                onSuccess: () => {
                  setIsDeleteModalOpen(false);
                  history.push('/online');
                },
              }
            );
          }}
          cancelButtonText={i18n.translate(
            'xpack.evals.onlineEvaluations.detail.deleteModalCancel',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.evals.onlineEvaluations.detail.deleteModalConfirm',
            {
              defaultMessage: 'Delete',
            }
          )}
          buttonColor="danger"
        >
          <p>
            {i18n.translate('xpack.evals.onlineEvaluations.detail.deleteModalBody', {
              defaultMessage: 'Delete workflow "{name}"?',
              values: { name: workflow.name },
            })}
          </p>
        </EuiConfirmModal>
      ) : null}
      {selectedTraceId ? (
        <EuiFlyoutResizable
          ownFocus
          onClose={() => setSelectedTraceId(null)}
          size="l"
          minWidth={480}
          maxWidth={1600}
          aria-labelledby="onlineEvalTraceWaterfallTitle"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id="onlineEvalTraceWaterfallTitle" style={{ wordBreak: 'break-all' }}>
                {i18n.translate('xpack.evals.onlineEvaluations.detail.traceFlyoutTitle', {
                  defaultMessage: 'Trace waterfall: {traceId}',
                  values: { traceId: selectedTraceId },
                })}
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
                layout="horizontal"
              />
            </div>
          </EuiFlyoutBody>
        </EuiFlyoutResizable>
      ) : null}
    </>
  );
};
