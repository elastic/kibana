/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiBasicTable,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiBadge,
  EuiPanel,
  EuiSuperSelect,
  EuiFormRow,
  EuiCheckbox,
  EuiToolTip,
  EuiIcon,
  EuiAccordion,
  EuiAvatar,
  EuiSkeletonText,
  EuiTextArea,
  EuiHorizontalRule,
  EuiLink,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useLoadConnectors } from '@kbn/inference-connectors';
import type { TracingProject } from '@kbn/evals-common';
import { useKibana } from '../../hooks/use_kibana';
import { useDefaultConnector } from '../../hooks/chat/use_default_connector';
import { useConnectorSelection } from '../../hooks/chat/use_connector_selection';
import { RoundTraceButton } from '../conversations/conversation_rounds/round_response/round_trace_button';
import { useKiEvaluation, type ValidatedTrace, type ProjectTracesState } from './use_ki_evaluation';

interface ProviderInfo {
  label: string;
  iconType: string;
  color: string;
}

const getProviderInfo = (projectName: string): ProviderInfo => {
  const lower = projectName.toLowerCase();
  if (lower.includes('elastic')) {
    return { label: 'Elastic', iconType: 'logoElastic', color: '#00bfb3' };
  }
  if (lower.includes('claude') || lower.includes('anthropic')) {
    return { label: 'Anthropic', iconType: 'sparkles', color: '#d4a96a' };
  }
  if (lower.includes('openai') || lower.includes('gpt')) {
    return { label: 'OpenAI', iconType: 'sparkles', color: '#74aa9c' };
  }
  if (lower.includes('gemini') || lower.includes('google')) {
    return { label: 'Google', iconType: 'sparkles', color: '#4285f4' };
  }
  return { label: projectName, iconType: 'dot', color: '#6b7280' };
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
    loadProjectTraces,
    toggleTraceSelection,
    toggleAllTracesForProject,
    runEvaluation,
    fetchExperimentScores,
    goToStep,
    setTraceReferenceData,
    reset,
  } = useKiEvaluation();

  const { selectedConnector: savedConnector, defaultConnectorId } = useConnectorSelection();
  const [selectedConnectorId, setSelectedConnectorId] = useState(savedConnector ?? '');
  const [selectedEvaluatorNames, setSelectedEvaluatorNames] = useState<string[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchEvaluators();
  }, [fetchProjects, fetchEvaluators]);

  // Default-select only evaluators that don't require user-supplied reference data.
  useEffect(() => {
    if (state.evaluators.length > 0 && selectedEvaluatorNames.length === 0) {
      setSelectedEvaluatorNames(
        state.evaluators.filter((e) => !e.reference_data_schema).map((e) => e.name)
      );
    }
  }, [state.evaluators, selectedEvaluatorNames.length]);

  const needsReferenceData = useMemo(
    () =>
      state.evaluators.some(
        (e) => e.reference_data_schema && selectedEvaluatorNames.includes(e.name)
      ),
    [state.evaluators, selectedEvaluatorNames]
  );

  const handleProceedFromTraces = useCallback(() => {
    if (!selectedConnectorId || selectedEvaluatorNames.length === 0) return;
    if (needsReferenceData) {
      goToStep('reference_data');
    } else {
      runEvaluation(selectedConnectorId, selectedEvaluatorNames);
    }
  }, [selectedConnectorId, selectedEvaluatorNames, needsReferenceData, goToStep, runEvaluation]);

  const handleRunEvaluation = useCallback(() => {
    if (selectedConnectorId && selectedEvaluatorNames.length > 0) {
      runEvaluation(selectedConnectorId, selectedEvaluatorNames);
    }
  }, [selectedConnectorId, selectedEvaluatorNames, runEvaluation]);

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

  const canRun =
    !state.isRunning &&
    Boolean(selectedConnectorId) &&
    selectedEvaluatorNames.length > 0 &&
    selectedCount > 0;

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
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
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

        {state.currentStep === 'traces' && (
          <TracesStep
            projects={state.projects}
            projectsLoading={state.projectsLoading}
            tracesByProject={state.tracesByProject}
            selectedConnectorId={selectedConnectorId}
            defaultConnectorId={defaultConnectorId}
            evaluators={state.evaluators}
            selectedEvaluatorNames={selectedEvaluatorNames}
            selectedCount={selectedCount}
            onConnectorChange={setSelectedConnectorId}
            onEvaluatorsChange={setSelectedEvaluatorNames}
            onLoadProjectTraces={loadProjectTraces}
            onToggleTrace={toggleTraceSelection}
            onToggleAll={toggleAllTracesForProject}
          />
        )}

        {state.currentStep === 'reference_data' && (
          <ReferenceDataStep
            tracesByProject={state.tracesByProject}
            evaluators={state.evaluators}
            selectedEvaluatorNames={selectedEvaluatorNames}
            traceReferenceData={state.traceReferenceData}
            onSetReferenceData={setTraceReferenceData}
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
                onClick={handleProceedFromTraces}
                isLoading={state.isRunning}
                isDisabled={!canRun}
                data-test-subj="kiEvalRunButton"
              >
                {needsReferenceData
                  ? i18n.translate('xpack.agentBuilder.kiEval.nextReferenceData', {
                      defaultMessage: 'Next: provide expected outputs',
                    })
                  : i18n.translate('xpack.agentBuilder.kiEval.runEvaluation', {
                      defaultMessage: 'Run evaluation ({count} traces)',
                      values: { count: selectedCount },
                    })}
              </EuiButton>
            )}
            {state.currentStep === 'reference_data' && (
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => goToStep('traces')}
                    iconType="arrowLeft"
                    iconSide="left"
                  >
                    {i18n.translate('xpack.agentBuilder.kiEval.backToTraces', {
                      defaultMessage: 'Back',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={handleRunEvaluation}
                    isLoading={state.isRunning}
                    isDisabled={!canRun}
                    data-test-subj="kiEvalRunButton"
                  >
                    {state.isRunning
                      ? state.progressMessage ??
                        i18n.translate('xpack.agentBuilder.kiEval.runningEvaluation', {
                          defaultMessage: 'Running evaluation...',
                        })
                      : i18n.translate('xpack.agentBuilder.kiEval.runEvaluation', {
                          defaultMessage: 'Run evaluation ({count} traces)',
                          values: { count: selectedCount },
                        })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
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

// ---------------------------------------------------------------------------
// TracesStep
// ---------------------------------------------------------------------------

interface TracesStepProps {
  projects: TracingProject[];
  projectsLoading: boolean;
  tracesByProject: Record<string, ProjectTracesState>;
  selectedConnectorId: string;
  defaultConnectorId?: string;
  evaluators: Array<{
    name: string;
    kind: 'llm' | 'code';
    description: string;
    reference_data_schema?: Record<string, unknown>;
  }>;
  selectedEvaluatorNames: string[];
  selectedCount: number;
  onConnectorChange: (id: string) => void;
  onEvaluatorsChange: (names: string[]) => void;
  onLoadProjectTraces: (project: TracingProject) => void;
  onToggleTrace: (projectName: string, traceId: string) => void;
  onToggleAll: (projectName: string, selected: boolean) => void;
}

const TracesStep: React.FC<TracesStepProps> = ({
  projects,
  projectsLoading,
  tracesByProject,
  selectedConnectorId,
  defaultConnectorId: parentDefaultConnectorId,
  evaluators,
  selectedEvaluatorNames,
  selectedCount,
  onConnectorChange,
  onEvaluatorsChange,
  onLoadProjectTraces,
  onToggleTrace,
  onToggleAll,
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

  const handleEvaluatorChange = useCallback(
    (optionId: string) => {
      const next = selectedEvaluatorNames.includes(optionId)
        ? selectedEvaluatorNames.filter((n) => n !== optionId)
        : [...selectedEvaluatorNames, optionId];
      onEvaluatorsChange(next);
    },
    [selectedEvaluatorNames, onEvaluatorsChange]
  );

  return (
    <>
      {/* Connector selector */}
      <EuiFormRow
        label={i18n.translate('xpack.agentBuilder.kiEval.connectorLabel', {
          defaultMessage: 'LLM connector',
        })}
        helpText={i18n.translate('xpack.agentBuilder.kiEval.connectorHelp', {
          defaultMessage:
            'Used by LLM-based evaluators (e.g. groundedness). Code-based evaluators do not require a connector.',
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

      <EuiSpacer size="xl" />

      {/* Evaluator selector */}
      {evaluators.length > 0 && (
        <>
          <EuiFormRow
            label={i18n.translate('xpack.agentBuilder.kiEval.evaluatorsLabel', {
              defaultMessage: 'Evaluators',
            })}
            helpText={i18n.translate('xpack.agentBuilder.kiEval.evaluatorsHelp', {
              defaultMessage: 'Choose which evaluators to run against the selected traces.',
            })}
          >
            <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false}>
              <div
                css={css`
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 23px 31px;
                `}
                data-test-subj="kiEvalEvaluatorSelector"
              >
                {evaluators.map((e) => {
                  const requiresInput = Boolean(e.reference_data_schema);
                  const checkbox = (
                    <EuiCheckbox
                      key={e.name}
                      id={`kiEvalEvaluator-${e.name}`}
                      checked={selectedEvaluatorNames.includes(e.name)}
                      onChange={() => handleEvaluatorChange(e.name)}
                      label={
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiText size="s">{e.name}</EuiText>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiBadge color="hollow">{e.kind}</EuiBadge>
                          </EuiFlexItem>
                          {requiresInput && (
                            <EuiFlexItem grow={false}>
                              <EuiBadge color="warning" iconType="indexEdit">
                                {i18n.translate(
                                  'xpack.agentBuilder.kiEval.evaluatorRequiresInput',
                                  { defaultMessage: 'requires input' }
                                )}
                              </EuiBadge>
                            </EuiFlexItem>
                          )}
                        </EuiFlexGroup>
                      }
                    />
                  );
                  return e.description ? (
                    <EuiToolTip key={e.name} content={e.description} position="top">
                      {checkbox}
                    </EuiToolTip>
                  ) : (
                    checkbox
                  );
                })}
              </div>
            </EuiPanel>
          </EuiFormRow>
          <EuiSpacer size="xl" />
        </>
      )}

      {/* Trace source/provider panels */}
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.agentBuilder.kiEval.sourcesDesc', {
            defaultMessage:
              'Select traces from the providers below. Expand a provider to view and choose individual traces.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />

      {projectsLoading && (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              {i18n.translate('xpack.agentBuilder.kiEval.loadingProjects', {
                defaultMessage: 'Loading trace sources...',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {!projectsLoading && projects.length === 0 && (
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.agentBuilder.kiEval.noProjects', {
            defaultMessage: 'No trace sources found',
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
      )}

      {projects.map((project) => {
        const llmEvaluatorNames = evaluators
          .filter((e) => e.kind === 'llm' && selectedEvaluatorNames.includes(e.name))
          .map((e) => e.name);
        const tokenEvaluatorNames = ['input_tokens', 'output_tokens', 'tool_calls'].filter((name) =>
          selectedEvaluatorNames.includes(name)
        );
        return (
          <ProjectSourcePanel
            key={project.name}
            project={project}
            projectState={tracesByProject[project.name]}
            selectedCount={
              (tracesByProject[project.name]?.traces ?? []).filter((vt) => vt.selected).length
            }
            totalSelectedCount={selectedCount}
            llmEvaluatorNames={llmEvaluatorNames}
            tokenEvaluatorNames={tokenEvaluatorNames}
            onExpand={onLoadProjectTraces}
            onToggleTrace={onToggleTrace}
            onToggleAll={onToggleAll}
          />
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------------------
// ProjectSourcePanel — accordion for a single provider/project
// ---------------------------------------------------------------------------

interface ProjectSourcePanelProps {
  project: TracingProject;
  projectState?: ProjectTracesState;
  selectedCount: number;
  totalSelectedCount: number;
  llmEvaluatorNames: string[];
  tokenEvaluatorNames: string[];
  onExpand: (project: TracingProject) => void;
  onToggleTrace: (projectName: string, traceId: string) => void;
  onToggleAll: (projectName: string, selected: boolean) => void;
}

const ProjectSourcePanel: React.FC<ProjectSourcePanelProps> = ({
  project,
  projectState,
  selectedCount,
  llmEvaluatorNames,
  tokenEvaluatorNames,
  onExpand,
  onToggleTrace,
  onToggleAll,
}) => {
  const provider = useMemo(() => getProviderInfo(project.name), [project.name]);
  const accordionId = useGeneratedHtmlId({ prefix: `kiEvalProject-${project.name}` });

  const handleToggle = useCallback(
    (isOpen: boolean) => {
      if (isOpen) onExpand(project);
    },
    [onExpand, project]
  );

  const buttonContent = (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {provider.iconType === 'logoElastic' ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type="logoElastic" size="l" aria-hidden={true} />
            </EuiFlexItem>
          ) : (
            <EuiFlexItem grow={false}>
              <EuiAvatar name={provider.label} size="s" color={provider.color} type="space" />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiBadge color="subdued">{provider.label}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{project.name}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.agentBuilder.kiEval.traceCount', {
                  defaultMessage: '{count} traces',
                  values: { count: project.trace_count },
                })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          {selectedCount > 0 && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="primary">
                {i18n.translate('xpack.agentBuilder.kiEval.selectedCount', {
                  defaultMessage: '{count} selected',
                  values: { count: selectedCount },
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      <EuiPanel paddingSize="m" hasBorder>
        <EuiAccordion
          id={accordionId}
          buttonContent={buttonContent}
          onToggle={handleToggle}
          paddingSize="m"
        >
          <ProjectTracesContent
            projectName={project.name}
            projectState={projectState}
            selectedCount={selectedCount}
            llmEvaluatorNames={llmEvaluatorNames}
            tokenEvaluatorNames={tokenEvaluatorNames}
            onToggleTrace={onToggleTrace}
            onToggleAll={onToggleAll}
          />
        </EuiAccordion>
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
};

// ---------------------------------------------------------------------------
// ProjectTracesContent — traces table inside the accordion
// ---------------------------------------------------------------------------

interface ProjectTracesContentProps {
  projectName: string;
  projectState?: ProjectTracesState;
  selectedCount: number;
  llmEvaluatorNames: string[];
  tokenEvaluatorNames: string[];
  onToggleTrace: (projectName: string, traceId: string) => void;
  onToggleAll: (projectName: string, selected: boolean) => void;
}

const ProjectTracesContent: React.FC<ProjectTracesContentProps> = ({
  projectName,
  projectState,
  selectedCount,
  llmEvaluatorNames,
  tokenEvaluatorNames,
  onToggleTrace,
  onToggleAll,
}) => {
  if (!projectState || projectState.isLoading) {
    return <EuiSkeletonText lines={3} />;
  }

  if (projectState.error) {
    return (
      <EuiCallOut
        color="danger"
        iconType="error"
        size="s"
        title={projectState.error}
        announceOnMount
      />
    );
  }

  const { traces } = projectState;
  const validCount = traces.filter((vt) => vt.validation.valid).length;
  const allValidSelected = validCount > 0 && selectedCount === validCount;

  const columns: Array<EuiBasicTableColumn<ValidatedTrace>> = [
    {
      field: 'selected',
      name: (
        <EuiCheckbox
          id={`kiEvalSelectAll-${projectName}`}
          checked={allValidSelected}
          onChange={() => onToggleAll(projectName, !allValidSelected)}
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
          onChange={() => onToggleTrace(projectName, item.trace.trace_id)}
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
        const affectedEvaluators = [
          ...(!item.validation.hasChatEvents ? llmEvaluatorNames : []),
          ...(!item.validation.hasTokenData ? tokenEvaluatorNames : []),
        ];
        if (affectedEvaluators.length > 0) {
          const tooltipMsg = i18n.translate('xpack.agentBuilder.kiEval.evaluatorsMightFail', {
            defaultMessage:
              'Evaluators {names} might fail because the trace is missing required data.',
            values: { names: affectedEvaluators.join(', ') },
          });
          return (
            <EuiToolTip content={tooltipMsg}>
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
      render: (item: ValidatedTrace) => <RoundTraceButton traceId={item.trace.trace_id} />,
    },
  ];

  return (
    <>
      <EuiText size="xs" color="subdued">
        <strong>
          {i18n.translate('xpack.agentBuilder.kiEval.tracesSummary', {
            defaultMessage: '{selected} of {total} traces selected',
            values: { selected: selectedCount, total: traces.length },
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="s" />

      <EuiBasicTable
        items={traces}
        columns={columns}
        tableLayout="fixed"
        tableCaption={i18n.translate('xpack.agentBuilder.kiEval.tracesTableCaption', {
          defaultMessage: 'Traces available for evaluation',
        })}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// ReferenceDataStep — collect expected outputs for evaluators that need them
// ---------------------------------------------------------------------------

interface ReferenceDataStepProps {
  tracesByProject: Record<string, ProjectTracesState>;
  evaluators: Array<{
    name: string;
    kind: 'llm' | 'code';
    description: string;
    reference_data_schema?: Record<string, unknown>;
  }>;
  selectedEvaluatorNames: string[];
  traceReferenceData: Record<string, Record<string, string>>;
  onSetReferenceData: (traceId: string, field: string, value: string) => void;
}

const ReferenceDataStep: React.FC<ReferenceDataStepProps> = ({
  tracesByProject,
  evaluators,
  selectedEvaluatorNames,
  traceReferenceData,
  onSetReferenceData,
}) => {
  const selectedTraces = Object.values(tracesByProject)
    .flatMap((p) => p.traces)
    .filter((vt) => vt.selected);

  const evaluatorsNeedingInput = evaluators.filter(
    (e) => e.reference_data_schema && selectedEvaluatorNames.includes(e.name)
  );

  return (
    <>
      <EuiCallOut
        color="warning"
        iconType="indexEdit"
        size="s"
        title={i18n.translate('xpack.agentBuilder.kiEval.referenceDataRequired', {
          defaultMessage:
            'The selected evaluator(s) require expected outputs to compare against. Fill in the fields below for each trace.',
        })}
      />
      <EuiSpacer size="m" />

      {selectedTraces.map((vt, idx) => (
        <React.Fragment key={vt.trace.trace_id}>
          <EuiPanel paddingSize="m" hasBorder>
            <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{vt.trace.name}</strong>
                </EuiText>
                {vt.trace.user_prompt && (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiText size="xs" color="subdued">
                      <em>
                        {i18n.translate('xpack.agentBuilder.kiEval.userPromptLabel', {
                          defaultMessage: 'User prompt:',
                        })}
                      </em>{' '}
                      {vt.trace.user_prompt}
                    </EuiText>
                  </>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            {evaluatorsNeedingInput.map((e) => (
              <EuiFormRow
                key={e.name}
                label={i18n.translate('xpack.agentBuilder.kiEval.expectedOutputLabel', {
                  defaultMessage: 'Expected output ({evaluator})',
                  values: { evaluator: e.name },
                })}
                helpText={e.description}
                fullWidth
              >
                <EuiTextArea
                  value={traceReferenceData[vt.trace.trace_id]?.expected ?? ''}
                  onChange={(ev) =>
                    onSetReferenceData(vt.trace.trace_id, 'expected', ev.target.value)
                  }
                  placeholder={i18n.translate(
                    'xpack.agentBuilder.kiEval.expectedOutputPlaceholder',
                    { defaultMessage: 'Enter the expected answer for this trace…' }
                  )}
                  rows={3}
                  fullWidth
                  compressed
                  data-test-subj={`kiEvalExpectedOutput-${vt.trace.trace_id}`}
                />
              </EuiFormRow>
            ))}
          </EuiPanel>
          {idx < selectedTraces.length - 1 && <EuiHorizontalRule margin="s" />}
        </React.Fragment>
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------
// ResultsStep
// ---------------------------------------------------------------------------

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
          {i18n.translate('xpack.agentBuilder.kiEval.resultsSummaryCounts', {
            defaultMessage: '{okCount} scores recorded, {errCount} errors.',
            values: { okCount, errCount },
          })}
        </p>
        {experimentId && (
          <p>
            {i18n.translate('xpack.agentBuilder.kiEval.experimentIdLabel', {
              defaultMessage: 'Experiment ID:',
            })}{' '}
            <EuiLink
              href={`/app/management/ai/evals/experiments/${experimentId}?execution_id=${experimentId}`}
              target="_blank"
            >
              {experimentId}
            </EuiLink>
          </p>
        )}
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
      render: (label: string, item: EvaluatorScoreRow) => {
        const text = item.status === 'error' ? item.errorMessage ?? '—' : label ?? '—';
        return (
          <EuiToolTip content={text} position="top">
            <span
              css={css`
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              `}
            >
              {text}
            </span>
          </EuiToolTip>
        );
      },
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
