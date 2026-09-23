/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiComboBox,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiForm,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiSwitch,
  EuiToolTip,
  useEuiTheme,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  EVALS_ONLINE_SCORES_URL,
  EVALS_EVALUATORS_URL,
  type ListOnlineScoresResponse,
  type ListEvaluatorsResponse,
} from '@kbn/evals-common';
import { LensConfigBuilder, type LensApiConfig } from '@kbn/lens-embeddable-utils';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { useParams, useHistory } from 'react-router-dom';
import { TraceWaterfall, useTraceSpans } from '@kbn/llm-trace-waterfall';
import { useEvalsTraceFetcher } from '../../hooks/use_evals_api';
import { OnlineEvalScoresTable } from '../../components/online_eval_scores_table';
import {
  useDeleteOnlineEvalWorkflow,
  useOnlineEvalWorkflow,
  useToggleOnlineEvalWorkflow,
  useUpdateOnlineEvalWorkflow,
} from '../../hooks/use_online_eval_workflows';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import type { OnlineEvalWorkflowConfig } from '../../../common/online_evals/workflow_yaml';
import { useModelConnectors } from '../../hooks/use_model_connectors';
import {
  ConnectorSelector,
  type ConnectorSelectorOption,
} from '../../components/shared/connector_selector';

const SCORES_PER_PAGE = 25;
const ONLINE_SCORES_DATA_VIEW = '.evaluation-online-scores';
const ONLINE_SCORES_TIME_FIELD = '@timestamp';
const EMPTY_TIME_RANGE = {
  from: 'now-90d',
  to: 'now',
} as const;

interface EvaluatorOption extends EuiComboBoxOptionOption<string> {
  value: string;
  kind: 'llm' | 'code';
  version: string;
}

const EVERY_OPTIONS = [
  { value: '5m', text: '5m' },
  { value: '15m', text: '15m' },
  { value: '1h', text: '1h' },
  { value: '6h', text: '6h' },
  { value: '1d', text: '1d' },
];

const areConfigsEqual = (left: OnlineEvalWorkflowConfig, right: OnlineEvalWorkflowConfig) =>
  JSON.stringify(left) === JSON.stringify(right);

const useOnlineEvalDraft = ({
  initialConfig,
  onSave,
}: {
  initialConfig?: OnlineEvalWorkflowConfig;
  onSave: (nextConfig: OnlineEvalWorkflowConfig) => Promise<void>;
}) => {
  const [saved, setSaved] = React.useState<OnlineEvalWorkflowConfig | undefined>(initialConfig);
  const [draft, setDraft] = React.useState<OnlineEvalWorkflowConfig | undefined>(initialConfig);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setSaved(initialConfig);
    setDraft(initialConfig);
  }, [initialConfig]);

  const hasChanged = saved != null && draft != null && !areConfigsEqual(saved, draft);

  const reset = React.useCallback(() => {
    setDraft(saved);
  }, [saved]);

  const save = React.useCallback(async () => {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(draft);
      setSaved(draft);
    } finally {
      setIsSaving(false);
    }
  }, [draft, onSave]);

  return { saved, draft, setDraft, hasChanged, reset, save, isSaving };
};

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDataViewLoading, setIsDataViewLoading] = useState(true);
  const [dataViewId, setDataViewId] = useState<string | null>(null);
  const [dataViewError, setDataViewError] = useState<Error | null>(null);
  const {
    data: workflow,
    isLoading: isWorkflowLoading,
    error: workflowError,
  } = useOnlineEvalWorkflow(workflowId);
  const updateWorkflow = useUpdateOnlineEvalWorkflow();
  const {
    connectors,
    isLoading: isLoadingConnectors,
    error: connectorsError,
  } = useModelConnectors();
  const [evaluatorOptions, setEvaluatorOptions] = React.useState<EvaluatorOption[]>([]);
  const [isLoadingEvaluators, setIsLoadingEvaluators] = React.useState(false);
  const [editErrorMessage, setEditErrorMessage] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    let cancelled = false;

    const loadEvaluators = async () => {
      setIsLoadingEvaluators(true);
      try {
        const response = await services.http.get<ListEvaluatorsResponse>(EVALS_EVALUATORS_URL, {
          version: API_VERSIONS.internal.v1,
        });

        if (cancelled) {
          return;
        }

        setEvaluatorOptions(
          response.evaluators.map((evaluator) => ({
            value: evaluator.name,
            label: evaluator.version
              ? `${evaluator.name}@${evaluator.version} (${evaluator.kind})`
              : `${evaluator.name} (${evaluator.kind})`,
            kind: evaluator.kind,
            version: evaluator.version,
          }))
        );
      } catch (error) {
        if (!cancelled) {
          setEditErrorMessage(
            i18n.translate('xpack.evals.onlineEvaluations.detail.loadEvaluatorsError', {
              defaultMessage: 'Failed to load evaluators: {message}',
              values: { message: String(error) },
            })
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingEvaluators(false);
        }
      }
    };

    loadEvaluators();

    return () => {
      cancelled = true;
    };
  }, [services.http]);

  const draftState = useOnlineEvalDraft({
    initialConfig: workflow?.parsedConfig,
    onSave: async (nextConfig) => {
      await updateWorkflow.mutateAsync({
        workflowId,
        config: nextConfig,
      });
    },
  });

  const connectorOptions = React.useMemo<ConnectorSelectorOption[]>(() => {
    const options = connectors.map((connector) => ({
      value: connector.id,
      label: connector.name,
    }));

    // A configured connector that is no longer selectable (deleted, or not chat-capable) still
    // needs an option, otherwise the combo box renders empty and hides what the workflow uses.
    const configuredConnectorId = draftState.draft?.connectorId;
    if (
      configuredConnectorId &&
      !options.some((option) => option.value === configuredConnectorId)
    ) {
      return [...options, { value: configuredConnectorId, label: configuredConnectorId }];
    }

    return options;
  }, [connectors, draftState.draft?.connectorId]);

  const selectedConnectorIds = React.useMemo<string[]>(
    () => (draftState.draft?.connectorId ? [draftState.draft.connectorId] : []),
    [draftState.draft?.connectorId]
  );

  const selectedEvaluators = React.useMemo<EvaluatorOption[]>(
    () =>
      (draftState.draft?.evaluators ?? []).map((evaluator) => {
        const matched = evaluatorOptions.find(
          (option) => option.value === evaluator.name && option.version === evaluator.version
        );

        return (
          matched ?? {
            value: evaluator.name,
            version: evaluator.version ?? '',
            kind: 'llm',
            label: evaluator.version ? `${evaluator.name}@${evaluator.version}` : evaluator.name,
          }
        );
      }),
    [draftState.draft?.evaluators, evaluatorOptions]
  );

  const canEditSettings = canManage && Boolean(draftState.draft);
  const hasLlmEvaluatorSelected = selectedEvaluators.some((option) => option.kind === 'llm');
  const connectorMissing = hasLlmEvaluatorSelected && !draftState.draft?.connectorId;

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

  const updateErrorMessage = updateWorkflow.error
    ? i18n.translate('xpack.evals.onlineEvaluations.detail.updateWorkflowError', {
        defaultMessage: 'Failed to save online evaluation settings: {message}',
        values: { message: String(updateWorkflow.error) },
      })
    : null;
  const connectorsErrorMessage = connectorsError
    ? i18n.translate('xpack.evals.onlineEvaluations.detail.loadConnectorsError', {
        defaultMessage: 'Failed to load connectors: {message}',
        values: { message: String(connectorsError) },
      })
    : null;
  const editorErrorMessage = editErrorMessage ?? connectorsErrorMessage ?? updateErrorMessage;

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
          actions={[
            <EuiButton onClick={() => history.push('/online')}>
              {i18n.translate('xpack.evals.onlineEvaluations.detail.backToOnlineListButton', {
                defaultMessage: 'Back to Online evaluations',
              })}
            </EuiButton>,
          ]}
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
                <EuiToolTip
                  disableScreenReaderOutput
                  content={i18n.translate(
                    'xpack.evals.onlineEvaluations.detail.deleteButton.tooltip',
                    {
                      defaultMessage: 'Delete online evaluation',
                    }
                  )}
                >
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
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {!canManage ? (
          <>
            <EuiCallOut
              announceOnMount={false}
              title={i18n.translate(
                'xpack.evals.onlineEvaluations.detail.permissionsCallout.title',
                {
                  defaultMessage: 'You need additional privileges to manage online evaluations',
                }
              )}
              iconType="lock"
              color="warning"
              data-test-subj="onlineEvalDetailNoPermissionCallout"
            />
            <EuiSpacer size="m" />
          </>
        ) : null}
        {workflow.enabled && draftState.saved ? (
          <>
            <EuiCallOut
              announceOnMount={false}
              color="success"
              iconType="check"
              title={i18n.translate('xpack.evals.onlineEvaluations.detail.activeCalloutTitle', {
                defaultMessage: 'This online evaluation is active - runs every {interval}',
                values: { interval: draftState.saved.every },
              })}
              data-test-subj="onlineEvalDetailActiveCallout"
            />
            <EuiSpacer size="m" />
          </>
        ) : null}
        {editorErrorMessage ? (
          <>
            <EuiCallOut
              announceOnMount
              title={i18n.translate(
                'xpack.evals.onlineEvaluations.detail.editorErrorCalloutTitle',
                {
                  defaultMessage: 'Unable to update settings',
                }
              )}
              iconType="warning"
              color="danger"
              data-test-subj="onlineEvalDetailEditorErrorCallout"
            >
              <p>{editorErrorMessage}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}
        {draftState.draft ? (
          <>
            <EuiPanel hasBorder hasShadow={false} paddingSize="none">
              <EuiPanel hasShadow={false} color="subdued">
                <EuiText size="s">
                  <h3>
                    {i18n.translate('xpack.evals.onlineEvaluations.detail.schedulePanelTitle', {
                      defaultMessage: 'Schedule & sampling',
                    })}
                  </h3>
                </EuiText>
              </EuiPanel>
              <EuiPanel hasShadow={false}>
                <EuiFlexGroup alignItems="flexStart" gutterSize="l">
                  <EuiFlexItem grow={2}>
                    <EuiText size="m">
                      <h4 id="onlineEvalDetailScheduleFieldTitle">
                        {i18n.translate('xpack.evals.onlineEvaluations.detail.scheduleFieldTitle', {
                          defaultMessage: 'Run interval',
                        })}
                      </h4>
                    </EuiText>
                    <EuiText color="subdued" size="s">
                      <p>
                        {i18n.translate(
                          'xpack.evals.onlineEvaluations.detail.scheduleFieldDescription',
                          {
                            defaultMessage: 'How often this online evaluation workflow runs.',
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={5}>
                    <EuiForm component="div">
                      <EuiFormRow fullWidth aria-labelledby="onlineEvalDetailScheduleFieldTitle">
                        <EuiSelect
                          fullWidth
                          options={EVERY_OPTIONS}
                          value={draftState.draft.every}
                          disabled={!canEditSettings}
                          onChange={(event) => {
                            setEditErrorMessage(null);
                            draftState.setDraft((previous) =>
                              previous ? { ...previous, every: event.target.value } : previous
                            );
                          }}
                          data-test-subj="onlineEvalDetailEverySelect"
                        />
                      </EuiFormRow>
                    </EuiForm>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiFlexGroup alignItems="flexStart" gutterSize="l">
                  <EuiFlexItem grow={2}>
                    <EuiText size="m">
                      <h4>
                        {i18n.translate('xpack.evals.onlineEvaluations.detail.windowFieldTitle', {
                          defaultMessage: 'Window (minutes)',
                        })}
                      </h4>
                    </EuiText>
                    <EuiText color="subdued" size="s">
                      <p>
                        {i18n.translate(
                          'xpack.evals.onlineEvaluations.detail.windowFieldDescription',
                          {
                            defaultMessage:
                              'How much trace history each run can sample before lag is applied.',
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={5}>
                    <EuiForm component="div">
                      <EuiFormRow fullWidth>
                        <EuiFieldNumber
                          fullWidth
                          min={1}
                          value={draftState.draft.windowMinutes}
                          disabled={!canEditSettings}
                          onChange={(event) => {
                            setEditErrorMessage(null);
                            draftState.setDraft((previous) =>
                              previous
                                ? {
                                    ...previous,
                                    windowMinutes: Math.max(1, Number(event.target.value) || 1),
                                  }
                                : previous
                            );
                          }}
                          data-test-subj="onlineEvalDetailWindowInput"
                        />
                      </EuiFormRow>
                    </EuiForm>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiFlexGroup alignItems="flexStart" gutterSize="l">
                  <EuiFlexItem grow={2}>
                    <EuiText size="m">
                      <h4>
                        {i18n.translate('xpack.evals.onlineEvaluations.detail.lagFieldTitle', {
                          defaultMessage: 'Lag (minutes)',
                        })}
                      </h4>
                    </EuiText>
                    <EuiText color="subdued" size="s">
                      <p>
                        {i18n.translate(
                          'xpack.evals.onlineEvaluations.detail.lagFieldDescription',
                          {
                            defaultMessage:
                              'How long to wait before evaluating fresh traces to reduce partial data.',
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={5}>
                    <EuiForm component="div">
                      <EuiFormRow fullWidth>
                        <EuiFieldNumber
                          fullWidth
                          min={0}
                          value={draftState.draft.lagMinutes}
                          disabled={!canEditSettings}
                          onChange={(event) => {
                            setEditErrorMessage(null);
                            draftState.setDraft((previous) =>
                              previous
                                ? {
                                    ...previous,
                                    lagMinutes: Math.max(0, Number(event.target.value) || 0),
                                  }
                                : previous
                            );
                          }}
                          data-test-subj="onlineEvalDetailLagInput"
                        />
                      </EuiFormRow>
                    </EuiForm>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiFlexGroup alignItems="flexStart" gutterSize="l">
                  <EuiFlexItem grow={2}>
                    <EuiText size="m">
                      <h4>
                        {i18n.translate(
                          'xpack.evals.onlineEvaluations.detail.maxTracesFieldTitle',
                          {
                            defaultMessage: 'Max traces per run',
                          }
                        )}
                      </h4>
                    </EuiText>
                    <EuiText color="subdued" size="s">
                      <p>
                        {i18n.translate(
                          'xpack.evals.onlineEvaluations.detail.maxTracesFieldDescription',
                          {
                            defaultMessage: 'Upper bound of traces selected each scheduled run.',
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={5}>
                    <EuiForm component="div">
                      <EuiFormRow fullWidth>
                        <EuiFieldNumber
                          fullWidth
                          min={1}
                          value={draftState.draft.maxTracesPerRun}
                          disabled={!canEditSettings}
                          onChange={(event) => {
                            setEditErrorMessage(null);
                            draftState.setDraft((previous) =>
                              previous
                                ? {
                                    ...previous,
                                    maxTracesPerRun: Math.max(1, Number(event.target.value) || 1),
                                  }
                                : previous
                            );
                          }}
                          data-test-subj="onlineEvalDetailMaxTracesInput"
                        />
                      </EuiFormRow>
                    </EuiForm>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiPanel>
            <EuiSpacer size="m" />
            <EuiPanel hasBorder hasShadow={false} paddingSize="none">
              <EuiPanel hasShadow={false} color="subdued">
                <EuiText size="s">
                  <h3>
                    {i18n.translate('xpack.evals.onlineEvaluations.detail.sourcePanelTitle', {
                      defaultMessage: 'Source',
                    })}
                  </h3>
                </EuiText>
              </EuiPanel>
              <EuiPanel hasShadow={false}>
                <EuiFlexGroup alignItems="flexStart" gutterSize="l">
                  <EuiFlexItem grow={2}>
                    <EuiText size="m">
                      <h4>
                        {i18n.translate('xpack.evals.onlineEvaluations.detail.nameFieldTitle', {
                          defaultMessage: 'Name',
                        })}
                      </h4>
                    </EuiText>
                    <EuiText color="subdued" size="s">
                      <p>
                        {i18n.translate(
                          'xpack.evals.onlineEvaluations.detail.nameFieldDescription',
                          {
                            defaultMessage: 'Workflow name is read-only after creation.',
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={5}>
                    <EuiForm component="div">
                      <EuiFormRow fullWidth>
                        <EuiFieldText
                          fullWidth
                          value={draftState.draft.name}
                          disabled
                          data-test-subj="onlineEvalDetailNameInput"
                        />
                      </EuiFormRow>
                    </EuiForm>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiFlexGroup alignItems="flexStart" gutterSize="l">
                  <EuiFlexItem grow={2}>
                    <EuiText size="m">
                      <h4>
                        {i18n.translate(
                          'xpack.evals.onlineEvaluations.detail.indexPatternFieldTitle',
                          {
                            defaultMessage: 'Source index pattern',
                          }
                        )}
                      </h4>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={5}>
                    <EuiForm component="div">
                      <EuiFormRow fullWidth>
                        <EuiFieldText
                          fullWidth
                          value={draftState.draft.indexPattern}
                          disabled={!canEditSettings}
                          onChange={(event) => {
                            setEditErrorMessage(null);
                            draftState.setDraft((previous) =>
                              previous
                                ? { ...previous, indexPattern: event.target.value }
                                : previous
                            );
                          }}
                          data-test-subj="onlineEvalDetailIndexPatternInput"
                        />
                      </EuiFormRow>
                    </EuiForm>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiFlexGroup alignItems="flexStart" gutterSize="l">
                  <EuiFlexItem grow={2}>
                    <EuiText size="m">
                      <h4>
                        {i18n.translate(
                          'xpack.evals.onlineEvaluations.detail.extraWhereFieldTitle',
                          {
                            defaultMessage: 'Optional ES|QL WHERE filter',
                          }
                        )}
                      </h4>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={5}>
                    <EuiForm component="div">
                      <EuiFormRow fullWidth>
                        <EuiTextArea
                          fullWidth
                          rows={3}
                          value={draftState.draft.extraEsqlWhere ?? ''}
                          disabled={!canEditSettings}
                          onChange={(event) => {
                            setEditErrorMessage(null);
                            draftState.setDraft((previous) =>
                              previous
                                ? {
                                    ...previous,
                                    extraEsqlWhere: event.target.value.trim()
                                      ? event.target.value
                                      : undefined,
                                  }
                                : previous
                            );
                          }}
                          data-test-subj="onlineEvalDetailExtraWhereInput"
                        />
                      </EuiFormRow>
                    </EuiForm>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiPanel>
            <EuiSpacer size="m" />
            <EuiPanel hasBorder hasShadow={false} paddingSize="none">
              <EuiPanel hasShadow={false} color="subdued">
                <EuiText size="s">
                  <h3>
                    {i18n.translate('xpack.evals.onlineEvaluations.detail.evaluatorsPanelTitle', {
                      defaultMessage: 'Evaluators & connector',
                    })}
                  </h3>
                </EuiText>
              </EuiPanel>
              <EuiPanel hasShadow={false}>
                <EuiFlexGroup alignItems="flexStart" gutterSize="l">
                  <EuiFlexItem grow={2}>
                    <EuiText size="m">
                      <h4 id="onlineEvalDetailEvaluatorsFieldTitle">
                        {i18n.translate(
                          'xpack.evals.onlineEvaluations.detail.evaluatorsFieldTitle',
                          {
                            defaultMessage: 'Evaluators',
                          }
                        )}
                      </h4>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={5}>
                    <EuiForm component="div">
                      <EuiFormRow fullWidth aria-labelledby="onlineEvalDetailEvaluatorsFieldTitle">
                        <EuiComboBox
                          fullWidth
                          isLoading={isLoadingEvaluators}
                          options={evaluatorOptions}
                          selectedOptions={selectedEvaluators}
                          onChange={(options) => {
                            setEditErrorMessage(null);
                            draftState.setDraft((previous) =>
                              previous
                                ? {
                                    ...previous,
                                    evaluators: (options as EvaluatorOption[]).map((option) => ({
                                      name: option.value,
                                      version: option.version,
                                    })),
                                  }
                                : previous
                            );
                          }}
                          isDisabled={!canEditSettings}
                          data-test-subj="onlineEvalDetailEvaluatorsCombo"
                        />
                      </EuiFormRow>
                    </EuiForm>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiFlexGroup alignItems="flexStart" gutterSize="l">
                  <EuiFlexItem grow={2}>
                    <EuiText size="m">
                      <h4 id="onlineEvalDetailConnectorFieldTitle">
                        {i18n.translate(
                          'xpack.evals.onlineEvaluations.detail.connectorFieldTitle',
                          {
                            defaultMessage: 'Connector',
                          }
                        )}
                      </h4>
                    </EuiText>
                    <EuiText color="subdued" size="s">
                      <p>
                        {i18n.translate(
                          'xpack.evals.onlineEvaluations.detail.connectorFieldDescription',
                          {
                            defaultMessage: 'Required when any selected evaluator is of kind llm.',
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={5}>
                    <EuiForm component="div">
                      <ConnectorSelector
                        ariaLabelledBy="onlineEvalDetailConnectorFieldTitle"
                        selectedConnectorIds={selectedConnectorIds}
                        connectorOptions={connectorOptions}
                        onChange={(connectorIds) => {
                          setEditErrorMessage(null);
                          draftState.setDraft((previous) =>
                            previous
                              ? { ...previous, connectorId: connectorIds[0] ?? '' }
                              : previous
                          );
                        }}
                        isLoading={isLoadingConnectors}
                        isDisabled={!canEditSettings}
                        isInvalid={connectorMissing}
                        error={
                          connectorMissing
                            ? i18n.translate(
                                'xpack.evals.onlineEvaluations.detail.connectorMissingError',
                                {
                                  defaultMessage: 'Connector is required for llm evaluators.',
                                }
                              )
                            : undefined
                        }
                        dataTestSubj="onlineEvalDetailConnectorCombo"
                        singleSelection
                      />
                    </EuiForm>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiPanel>
            <EuiSpacer size="m" />
          </>
        ) : null}
        <EuiText size="s">
          <h3>
            {i18n.translate('xpack.evals.onlineEvaluations.detail.scoresSectionTitle', {
              defaultMessage: 'Scores and traces',
            })}
          </h3>
        </EuiText>
        <EuiSpacer size="m" />
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
          <OnlineEvalScoresTable
            items={scoresData}
            totalItemCount={scoresTotal}
            pageIndex={pageIndex}
            pageSize={SCORES_PER_PAGE}
            loading={scoresLoading}
            onPageChange={setPageIndex}
            onTraceClick={setSelectedTraceId}
          />
        )}
        <EuiSpacer size="l" />
        <EuiPanel hasBorder hasShadow={false} paddingSize="m">
          <EuiText size="s">
            <h3>
              {i18n.translate('xpack.evals.onlineEvaluations.detail.trendsSectionTitle', {
                defaultMessage: 'Score trends',
              })}
            </h3>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.evals.onlineEvaluations.detail.trendsSectionDescription', {
                defaultMessage: 'Secondary view of score distribution over time.',
              })}
            </p>
          </EuiText>
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
        </EuiPanel>
      </EuiPageSection>
      {draftState.hasChanged ? (
        <EuiBottomBar data-test-subj="onlineEvalDetailBottomBar">
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="text"
                size="s"
                onClick={() => {
                  setEditErrorMessage(null);
                  draftState.reset();
                }}
                isDisabled={draftState.isSaving}
                data-test-subj="onlineEvalDetailCancelButton"
              >
                {i18n.translate('xpack.evals.onlineEvaluations.detail.cancelButton', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                isLoading={draftState.isSaving}
                isDisabled={!canEditSettings || connectorMissing}
                onClick={async () => {
                  setEditErrorMessage(null);
                  try {
                    await draftState.save();
                  } catch (error) {
                    setEditErrorMessage(String(error));
                  }
                }}
                data-test-subj="onlineEvalDetailSaveButton"
              >
                {i18n.translate('xpack.evals.onlineEvaluations.detail.saveButton', {
                  defaultMessage: 'Save changes',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      ) : null}
      {isDeleteModalOpen ? (
        <EuiConfirmModal
          aria-label={i18n.translate('xpack.evals.onlineEvaluations.detail.deleteModalAriaLabel', {
            defaultMessage: 'Delete online evaluation',
          })}
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
