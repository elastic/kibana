/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiStepsHorizontal,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiBasicTable,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiBadge,
  EuiSelectable,
  EuiPanel,
  EuiSuperSelect,
  EuiFormRow,
  EuiCheckbox,
  EuiToolTip,
  EuiIcon,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
  type EuiSelectableOption,
  type EuiStepsHorizontalProps,
} from '@elastic/eui';
import { useLoadConnectors } from '@kbn/inference-connectors';
import type { TracingProject } from '@kbn/evals-common';
import { useKibana } from '../../hooks/use_kibana';
import { useDefaultConnector } from '../../hooks/chat/use_default_connector';
import { useConnectorSelection } from '../../hooks/chat/use_connector_selection';
import { useKiEvaluation, type EvalStep, type ValidatedTrace } from './use_ki_evaluation';

const STEP_IDS: EvalStep[] = ['projects', 'traces', 'evaluate', 'results'];

const STEP_LABELS: Record<EvalStep, string> = {
  projects: i18n.translate('xpack.agentBuilder.kiEval.step.projects', {
    defaultMessage: 'Select project',
  }),
  traces: i18n.translate('xpack.agentBuilder.kiEval.step.traces', {
    defaultMessage: 'Select traces',
  }),
  evaluate: i18n.translate('xpack.agentBuilder.kiEval.step.evaluate', {
    defaultMessage: 'Run evaluation',
  }),
  results: i18n.translate('xpack.agentBuilder.kiEval.step.results', {
    defaultMessage: 'Results',
  }),
};

const STEP_DESCRIPTIONS: Record<EvalStep, string> = {
  projects: i18n.translate('xpack.agentBuilder.kiEval.desc.projects', {
    defaultMessage:
      'Choose a tracing project that contains Agent Builder conversation traces. These are OTel traces stored in the traces-* index.',
  }),
  traces: i18n.translate('xpack.agentBuilder.kiEval.desc.traces', {
    defaultMessage:
      'Select which traces to evaluate. Traces missing required data are flagged with warnings. LLM evaluators (groundedness) require private data to be enabled in the tracing config.',
  }),
  evaluate: i18n.translate('xpack.agentBuilder.kiEval.desc.evaluate', {
    defaultMessage:
      'Each trace is being graded by the evaluators. LLM-based evaluators use the selected connector. Code-based evaluators (latency, tokens) run locally. Traces without chat data skip LLM evaluators automatically.',
  }),
  results: i18n.translate('xpack.agentBuilder.kiEval.desc.results', {
    defaultMessage:
      'Evaluation complete. Scores have been ingested into the evals plugin. You can view the experiment in the Evals management section or compare it with future runs.',
  }),
};

interface Props {
  onClose: () => void;
}

export const KiEvaluationFlyout: React.FC<Props> = ({ onClose }) => {
  const {
    state,
    selectedCount,
    fetchProjects,
    fetchEvaluators,
    selectProject,
    toggleTraceSelection,
    toggleAllTraces,
    runEvaluation,
    fetchExperimentScores,
    reset,
  } = useKiEvaluation();

  const { selectedConnector: savedConnector, defaultConnectorId } = useConnectorSelection();
  const [selectedConnectorId, setSelectedConnectorId] = useState(savedConnector ?? '');

  useEffect(() => {
    fetchProjects();
    fetchEvaluators();
  }, [fetchProjects, fetchEvaluators]);

  const currentStepIndex = STEP_IDS.indexOf(state.currentStep);

  const horizontalSteps: EuiStepsHorizontalProps['steps'] = useMemo(
    () =>
      STEP_IDS.map((stepId, idx) => ({
        title: STEP_LABELS[stepId],
        status:
          idx < currentStepIndex
            ? ('complete' as const)
            : idx === currentStepIndex
            ? ('current' as const)
            : ('disabled' as const),
        onClick: () => {},
      })),
    [currentStepIndex]
  );

  const handleRunEvaluation = useCallback(() => {
    if (selectedConnectorId) {
      runEvaluation(selectedConnectorId);
    }
  }, [selectedConnectorId, runEvaluation]);

  useEffect(() => {
    if (state.currentStep === 'results' && state.experimentId) {
      fetchExperimentScores(state.experimentId);
    }
  }, [state.currentStep, state.experimentId, fetchExperimentScores]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'kiEvalFlyout' });

  return (
    <EuiFlyout
      onClose={handleClose}
      size="l"
      data-test-subj="kiEvaluationFlyout"
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>
            {i18n.translate('xpack.agentBuilder.kiEval.title', {
              defaultMessage: 'KI Evaluation (MVP)',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiStepsHorizontal steps={horizontalSteps} size="s" />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <p>{STEP_DESCRIPTIONS[state.currentStep]}</p>
        </EuiText>
        <EuiSpacer size="m" />

        {state.error && (
          <>
            <EuiCallOut
              announceOnMount
              title={i18n.translate('xpack.agentBuilder.kiEval.error', {
                defaultMessage: 'Error',
              })}
              color="danger"
              iconType="error"
            >
              <p>{state.error}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        {state.currentStep === 'projects' && (
          <ProjectsStep
            projects={state.projects}
            isLoading={state.isLoading}
            onSelect={selectProject}
          />
        )}

        {state.currentStep === 'traces' && (
          <TracesStep
            validatedTraces={state.validatedTraces}
            isLoading={state.isLoading}
            selectedConnectorId={selectedConnectorId}
            defaultConnectorId={defaultConnectorId}
            onConnectorChange={setSelectedConnectorId}
            onToggleTrace={toggleTraceSelection}
            onToggleAll={toggleAllTraces}
            selectedCount={selectedCount}
          />
        )}

        {state.currentStep === 'evaluate' && (
          <EvaluateStep
            isLoading={state.isLoading}
            progressMessage={state.progressMessage}
            results={state.evaluationResults}
          />
        )}

        {state.currentStep === 'results' && (
          <ResultsStep results={state.evaluationResults} experimentId={state.experimentId} />
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={handleClose}>
              {i18n.translate('xpack.agentBuilder.kiEval.close', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {state.currentStep === 'traces' && (
              <EuiButton
                fill
                onClick={handleRunEvaluation}
                isDisabled={!selectedConnectorId || selectedCount === 0}
                data-test-subj="kiEvalRunButton"
              >
                {i18n.translate('xpack.agentBuilder.kiEval.runEvaluation', {
                  defaultMessage: 'Run evaluation ({count} traces)',
                  values: { count: selectedCount },
                })}
              </EuiButton>
            )}
            {state.currentStep === 'results' && (
              <EuiButton fill onClick={handleClose}>
                {i18n.translate('xpack.agentBuilder.kiEval.done', {
                  defaultMessage: 'Done',
                })}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const ProjectsStep: React.FC<{
  projects: TracingProject[];
  isLoading: boolean;
  onSelect: (project: TracingProject) => void;
}> = ({ projects, isLoading, onSelect }) => {
  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            {i18n.translate('xpack.agentBuilder.kiEval.loadingProjects', {
              defaultMessage: 'Loading tracing projects...',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (projects.length === 0) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('xpack.agentBuilder.kiEval.noProjects', {
          defaultMessage: 'No tracing projects found',
        })}
        color="warning"
        iconType="warning"
      >
        <p>
          {i18n.translate('xpack.agentBuilder.kiEval.noProjectsDesc', {
            defaultMessage:
              'No OTel traces found in the traces-* index. Make sure Agent Builder tracing is enabled and you have had some conversations.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  const options: EuiSelectableOption[] = projects.map((p) => ({
    label: `${p.name} (${p.trace_count} traces)`,
    key: p.name,
  }));

  return (
    <EuiSelectable
      options={options}
      singleSelection
      onChange={(newOptions) => {
        const selected = newOptions.find((o) => o.checked === 'on');
        if (selected) {
          const project = projects.find((p) => p.name === selected.key);
          if (project) {
            onSelect(project);
          }
        }
      }}
      listProps={{ bordered: true }}
    >
      {(list) => list}
    </EuiSelectable>
  );
};

const TracesStep: React.FC<{
  validatedTraces: ValidatedTrace[];
  isLoading: boolean;
  selectedConnectorId: string;
  defaultConnectorId?: string;
  onConnectorChange: (connectorId: string) => void;
  onToggleTrace: (traceId: string) => void;
  onToggleAll: (selected: boolean) => void;
  selectedCount: number;
}> = ({
  validatedTraces,
  isLoading,
  selectedConnectorId,
  defaultConnectorId: parentDefaultConnectorId,
  onConnectorChange,
  onToggleTrace,
  onToggleAll,
  selectedCount,
}) => {
  const {
    services: { http, settings },
  } = useKibana();

  const { data: connectors, isLoading: connectorsLoading } = useLoadConnectors({
    http: http!,
    featureId: 'agent_builder',
    settings: settings!,
  });

  const initialConnectorId = useDefaultConnector({
    connectors: connectors ?? [],
    defaultConnectorId: parentDefaultConnectorId,
  });

  useEffect(() => {
    if (!selectedConnectorId && initialConnectorId) {
      onConnectorChange(initialConnectorId);
    }
  }, [selectedConnectorId, initialConnectorId, onConnectorChange]);

  const connectorOptions = useMemo(
    () =>
      (connectors ?? []).map((c) => ({
        value: c.id,
        inputDisplay: c.name,
        dropdownDisplay: c.name,
      })),
    [connectors]
  );

  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            {i18n.translate('xpack.agentBuilder.kiEval.loadingTraces', {
              defaultMessage: 'Loading traces...',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const invalidCount = validatedTraces.filter((vt) => !vt.validation.valid).length;
  const withoutChatData = validatedTraces.filter(
    (vt) => vt.validation.valid && !vt.validation.hasChatEvents
  ).length;
  const validCount = validatedTraces.filter((vt) => vt.validation.valid).length;
  const allValidSelected = validCount > 0 && selectedCount === validCount;

  const columns: Array<EuiBasicTableColumn<ValidatedTrace>> = [
    {
      field: 'selected',
      name: (
        <EuiCheckbox
          id="kiEvalSelectAll"
          checked={allValidSelected}
          onChange={() => onToggleAll(!allValidSelected)}
          aria-label={i18n.translate('xpack.agentBuilder.kiEval.selectAll', {
            defaultMessage: 'Select all valid traces',
          })}
        />
      ),
      width: '40px',
      render: (_: boolean, item: ValidatedTrace) => (
        <EuiCheckbox
          id={`kiEval-${item.trace.trace_id}`}
          checked={item.selected}
          disabled={!item.validation.valid}
          onChange={() => onToggleTrace(item.trace.trace_id)}
          aria-label={i18n.translate('xpack.agentBuilder.kiEval.selectTrace', {
            defaultMessage: 'Select trace {name}',
            values: { name: item.trace.name },
          })}
        />
      ),
    },
    {
      field: 'trace.name',
      name: i18n.translate('xpack.agentBuilder.kiEval.traceName', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      width: '160px',
    },
    {
      field: 'trace.user_prompt',
      name: i18n.translate('xpack.agentBuilder.kiEval.userPrompt', {
        defaultMessage: 'User prompt',
      }),
      truncateText: true,
      render: (prompt: string | undefined) => (
        <EuiText size="xs" color={prompt ? 'default' : 'subdued'}>
          {prompt ?? '—'}
        </EuiText>
      ),
    },
    {
      field: 'trace.duration_ms',
      name: i18n.translate('xpack.agentBuilder.kiEval.duration', {
        defaultMessage: 'Duration',
      }),
      width: '90px',
      render: (ms: number) => `${Math.round(ms)}ms`,
    },
    {
      field: 'validation',
      name: i18n.translate('xpack.agentBuilder.kiEval.validity', {
        defaultMessage: 'Status',
      }),
      width: '110px',
      render: (_: unknown, item: ValidatedTrace) => {
        if (!item.validation.valid) {
          return (
            <EuiToolTip content={item.validation.warnings.join(' ')}>
              <EuiBadge tabIndex={0} color="danger">
                <EuiIcon type="error" size="s" aria-hidden={true} /> Invalid
              </EuiBadge>
            </EuiToolTip>
          );
        }
        if (item.validation.warnings.length > 0) {
          return (
            <EuiToolTip content={item.validation.warnings.join(' ')}>
              <EuiBadge tabIndex={0} color="warning">
                <EuiIcon type="warning" size="s" aria-hidden={true} /> Warnings
              </EuiBadge>
            </EuiToolTip>
          );
        }
        return <EuiBadge color="success">Valid</EuiBadge>;
      },
    },
    {
      name: '',
      width: '40px',
      render: (item: ValidatedTrace) => (
        <EuiToolTip
          content={i18n.translate('xpack.agentBuilder.kiEval.viewTrace', {
            defaultMessage: 'View trace in Discover',
          })}
        >
          <EuiButtonIcon
            iconType="popout"
            aria-label={i18n.translate('xpack.agentBuilder.kiEval.viewTraceAriaLabel', {
              defaultMessage: 'View trace {name} in Discover',
              values: { name: item.trace.name },
            })}
            href={`/app/discover#/?_a=(query:(language:kuery,query:'trace.id: "${item.trace.trace_id}"'))`}
            target="_blank"
            size="xs"
          />
        </EuiToolTip>
      ),
    },
  ];

  return (
    <>
      {withoutChatData > 0 && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.agentBuilder.kiEval.missingChatData', {
              defaultMessage:
                '{count} {count, plural, one {trace is} other {traces are}} missing chat data',
              values: { count: withoutChatData },
            })}
            color="warning"
            iconType="warning"
            size="s"
          >
            <p>
              {i18n.translate('xpack.agentBuilder.kiEval.missingChatDataDesc', {
                defaultMessage:
                  'LLM evaluators (groundedness) will be skipped for these traces. To include them, enable private data (user prompts & LLM responses) in your Agent Builder tracing configuration. Code-based evaluators will still run.',
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}

      {invalidCount > 0 && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.agentBuilder.kiEval.invalidTraces', {
              defaultMessage:
                '{count} {count, plural, one {trace is} other {traces are}} invalid and cannot be selected',
              values: { count: invalidCount },
            })}
            color="danger"
            iconType="error"
            size="s"
          >
            <p>
              {i18n.translate('xpack.agentBuilder.kiEval.invalidTracesDesc', {
                defaultMessage:
                  'These traces have no spans. Check if tracing is configured correctly.',
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}

      <EuiPanel paddingSize="m" hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                {i18n.translate('xpack.agentBuilder.kiEval.tracesSummary', {
                  defaultMessage: '{selected} of {total} traces selected',
                  values: { selected: selectedCount, total: validatedTraces.length },
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiBasicTable
          items={validatedTraces}
          columns={columns}
          tableLayout="fixed"
          tableCaption={i18n.translate('xpack.agentBuilder.kiEval.tracesTableCaption', {
            defaultMessage: 'Traces available for evaluation',
          })}
        />
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiFormRow
        label={i18n.translate('xpack.agentBuilder.kiEval.connectorLabel', {
          defaultMessage: 'LLM connector',
        })}
        helpText={i18n.translate('xpack.agentBuilder.kiEval.connectorHelp', {
          defaultMessage:
            'Select the model used by LLM-based evaluators (e.g. groundedness). Code-based evaluators (latency, tokens) do not require a connector.',
        })}
      >
        <EuiSuperSelect
          options={connectorOptions}
          valueOfSelected={selectedConnectorId}
          onChange={onConnectorChange}
          isLoading={connectorsLoading}
          placeholder={i18n.translate('xpack.agentBuilder.kiEval.connectorPlaceholder', {
            defaultMessage: 'Select a connector',
          })}
          data-test-subj="kiEvalConnectorSelector"
          fullWidth
        />
      </EuiFormRow>
    </>
  );
};

interface EvaluatorScoreRow {
  traceId: string;
  traceName: string;
  evaluatorName: string;
  evaluatorKind: 'llm' | 'code';
  score?: number | null;
  label?: string;
  explanation?: string;
  status: 'ok' | 'error';
  errorMessage?: string;
}

const EvaluateStep: React.FC<{
  isLoading: boolean;
  progressMessage?: string;
  results: EvaluatorScoreRow[];
}> = ({ isLoading, progressMessage, results }) => {
  return (
    <>
      {isLoading && (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">{progressMessage}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {results.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <ScoresTable results={results} />
        </>
      )}
    </>
  );
};

const ResultsStep: React.FC<{
  results: EvaluatorScoreRow[];
  experimentId?: string;
}> = ({ results, experimentId }) => {
  const okCount = results.filter((r) => r.status === 'ok').length;
  const errCount = results.filter((r) => r.status === 'error').length;

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.agentBuilder.kiEval.resultsSummary', {
          defaultMessage: 'Evaluation finished',
        })}
        color="success"
        iconType="check"
      >
        <p>
          {i18n.translate('xpack.agentBuilder.kiEval.resultsSummaryDesc', {
            defaultMessage:
              '{okCount} scores recorded, {errCount} errors. Experiment ID: {experimentId}',
            values: {
              okCount,
              errCount,
              experimentId: experimentId ?? 'N/A',
            },
          })}
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
      <ScoresTable results={results} />
    </>
  );
};

const ScoresTable: React.FC<{ results: EvaluatorScoreRow[] }> = ({ results }) => {
  const columns: Array<EuiBasicTableColumn<EvaluatorScoreRow>> = [
    {
      field: 'traceName',
      name: i18n.translate('xpack.agentBuilder.kiEval.scoreTrace', {
        defaultMessage: 'Trace',
      }),
      truncateText: true,
      width: '200px',
    },
    {
      field: 'evaluatorName',
      name: i18n.translate('xpack.agentBuilder.kiEval.scoreEvaluator', {
        defaultMessage: 'Evaluator',
      }),
      width: '180px',
    },
    {
      field: 'evaluatorKind',
      name: i18n.translate('xpack.agentBuilder.kiEval.scoreKind', {
        defaultMessage: 'Kind',
      }),
      width: '80px',
      render: (kind: string) => <EuiBadge color="hollow">{kind}</EuiBadge>,
    },
    {
      field: 'score',
      name: i18n.translate('xpack.agentBuilder.kiEval.scoreValue', {
        defaultMessage: 'Score',
      }),
      width: '80px',
      render: (score: number | null | undefined) => (score != null ? score.toFixed(2) : '—'),
    },
    {
      field: 'status',
      name: i18n.translate('xpack.agentBuilder.kiEval.scoreStatus', {
        defaultMessage: 'Status',
      }),
      width: '80px',
      render: (status: string) => (
        <EuiBadge color={status === 'ok' ? 'success' : 'danger'}>{status}</EuiBadge>
      ),
    },
    {
      field: 'label',
      name: i18n.translate('xpack.agentBuilder.kiEval.scoreLabel', {
        defaultMessage: 'Label / Error',
      }),
      truncateText: true,
      render: (label: string, item: EvaluatorScoreRow) =>
        item.status === 'error' ? item.errorMessage ?? '—' : label ?? '—',
    },
  ];

  return (
    <EuiBasicTable
      items={results}
      columns={columns}
      tableLayout="fixed"
      tableCaption={i18n.translate('xpack.agentBuilder.kiEval.scoresTableCaption', {
        defaultMessage: 'Evaluation scores',
      })}
    />
  );
};
