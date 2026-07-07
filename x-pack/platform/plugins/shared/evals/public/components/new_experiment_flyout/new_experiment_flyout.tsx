/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  LaunchedExperimentConfig,
  RunExperimentRequest,
} from '../../../common/experiments/run_experiment';
import { useDatasets } from '../../hooks/use_evals_api';
import {
  useAgentBuilderAgents,
  useEvaluators,
  useModelConnectors,
  useExperimentTemplates,
  useRunExperiment,
  useSaveExperimentWorkflow,
  usePreviewExperiment,
} from '../../hooks/use_experiments_api';
import { YamlPreview } from '../yaml_preview';

const BUILT_IN_TARGETS = ['inference', 'agentBuilder.converse', 'agentBuilder.tool'] as const;
type BuiltInTarget = (typeof BUILT_IN_TARGETS)[number];
const isBuiltInTarget = (value: string): value is BuiltInTarget =>
  (BUILT_IN_TARGETS as readonly string[]).includes(value);

const strings = {
  title: i18n.translate('xpack.evals.newExperiment.title', { defaultMessage: 'New experiment' }),
  nameLabel: i18n.translate('xpack.evals.newExperiment.nameLabel', {
    defaultMessage: 'Experiment name',
  }),
  namePlaceholder: i18n.translate('xpack.evals.newExperiment.namePlaceholder', {
    defaultMessage: 'Optional — a default is derived from the task target',
  }),
  connectorsLabel: i18n.translate('xpack.evals.newExperiment.connectorsLabel', {
    defaultMessage: 'Model connector(s)',
  }),
  connectorsHelp: i18n.translate('xpack.evals.newExperiment.connectorsHelp', {
    defaultMessage: 'Select two or more connectors to run a cross-model comparison.',
  }),
  taskTargetLabel: i18n.translate('xpack.evals.newExperiment.taskTargetLabel', {
    defaultMessage: 'What to evaluate',
  }),
  agentIdLabel: i18n.translate('xpack.evals.newExperiment.agentIdLabel', {
    defaultMessage: 'Agent Builder agent ID',
  }),
  agentIdHelp: i18n.translate('xpack.evals.newExperiment.agentIdHelp', {
    defaultMessage: 'Pick an existing agent or type a custom agent ID.',
  }),
  toolIdLabel: i18n.translate('xpack.evals.newExperiment.toolIdLabel', {
    defaultMessage: 'Agent Builder tool ID',
  }),
  datasetsLabel: i18n.translate('xpack.evals.newExperiment.datasetsLabel', {
    defaultMessage: 'Dataset(s)',
  }),
  evaluatorsLabel: i18n.translate('xpack.evals.newExperiment.evaluatorsLabel', {
    defaultMessage: 'Evaluators',
  }),
  judgeConnectorLabel: i18n.translate('xpack.evals.newExperiment.judgeConnectorLabel', {
    defaultMessage: 'Judge connector',
  }),
  repetitionsLabel: i18n.translate('xpack.evals.newExperiment.repetitionsLabel', {
    defaultMessage: 'Repetitions',
  }),
  concurrencyLabel: i18n.translate('xpack.evals.newExperiment.concurrencyLabel', {
    defaultMessage: 'Concurrency',
  }),
  showYaml: i18n.translate('xpack.evals.newExperiment.showYaml', {
    defaultMessage: 'Show workflow YAML',
  }),
  compareLabel: i18n.translate('xpack.evals.newExperiment.compareLabel', {
    defaultMessage: 'Add model comparison step',
  }),
  compareHelp: i18n.translate('xpack.evals.newExperiment.compareHelp', {
    defaultMessage:
      'Appends an evals.compareExperiments step to the saved workflow (and preview) for cross-model runs. "Run now" compares from the run overview instead.',
  }),
  runNow: i18n.translate('xpack.evals.newExperiment.runNow', { defaultMessage: 'Run now' }),
  saveAsWorkflow: i18n.translate('xpack.evals.newExperiment.saveAsWorkflow', {
    defaultMessage: 'Save as workflow',
  }),
  cancel: i18n.translate('xpack.evals.newExperiment.cancel', { defaultMessage: 'Cancel' }),
  chooseConnectorTitle: i18n.translate('xpack.evals.newExperiment.chooseConnectorTitle', {
    defaultMessage: 'Task target',
  }),
};

interface SelectedEvaluator {
  name: string;
  version?: string;
  kind: 'llm' | 'code';
  connectorId?: string;
}

export interface NewExperimentFlyoutProps {
  onClose: () => void;
}

/**
 * The "New experiment" form. Users describe *what* to evaluate (connectors,
 * task target, datasets, evaluators) and the server infers the workflow shape.
 * Supports "Run now", "Save as workflow", and a live YAML preview.
 */
export const NewExperimentFlyout: React.FC<NewExperimentFlyoutProps> = ({ onClose }) => {
  const history = useHistory();
  const { services } = useKibana();
  const toasts = services.notifications?.toasts;

  const { data: connectorsData, isLoading: connectorsLoading } = useModelConnectors();
  const { data: datasetsData, isLoading: datasetsLoading } = useDatasets({ perPage: 1000 });
  const { data: evaluatorsData, isLoading: evaluatorsLoading } = useEvaluators();
  const { data: templatesData } = useExperimentTemplates();

  const runExperiment = useRunExperiment();
  const saveWorkflow = useSaveExperimentWorkflow();
  const preview = usePreviewExperiment();

  const [name, setName] = useState('');
  const [connectorIds, setConnectorIds] = useState<string[]>([]);
  const [taskTarget, setTaskTarget] = useState<string>('inference');
  const [agentId, setAgentId] = useState('');
  const [toolId, setToolId] = useState('');
  const [datasetIds, setDatasetIds] = useState<string[]>([]);
  const [evaluators, setEvaluators] = useState<SelectedEvaluator[]>([]);
  const [repetitions, setRepetitions] = useState<number | undefined>(1);
  const [concurrency, setConcurrency] = useState<number | undefined>(5);
  const [compare, setCompare] = useState(false);
  const [showYaml, setShowYaml] = useState(false);

  const isCrossModel = connectorIds.length >= 2;

  const { data: agentsData, isLoading: agentsLoading } = useAgentBuilderAgents({
    enabled: taskTarget === 'agentBuilder.converse',
  });

  const connectorOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => (connectorsData ?? []).map((c) => ({ label: c.name, value: c.id })),
    [connectorsData]
  );
  const datasetOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => (datasetsData?.datasets ?? []).map((d) => ({ label: d.name, value: d.id })),
    [datasetsData]
  );
  const evaluatorOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      (evaluatorsData?.evaluators ?? []).map((e) => ({
        label: e.kind === 'llm' ? `${e.name} (LLM)` : e.name,
        value: e.name,
      })),
    [evaluatorsData]
  );
  const agentOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      (agentsData ?? []).map((agent) => ({
        label: agent.name && agent.name !== agent.id ? `${agent.name} (${agent.id})` : agent.id,
        value: agent.id,
      })),
    [agentsData]
  );

  const taskTargetOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    const options: Array<EuiComboBoxOptionOption<string>> = [
      {
        value: 'inference',
        label: i18n.translate('xpack.evals.newExperiment.target.inference', {
          defaultMessage: 'Direct model invocation (inference)',
        }),
      },
      {
        value: 'agentBuilder.converse',
        label: i18n.translate('xpack.evals.newExperiment.target.converse', {
          defaultMessage: 'Agent Builder agent (converse)',
        }),
      },
      {
        value: 'agentBuilder.tool',
        label: i18n.translate('xpack.evals.newExperiment.target.tool', {
          defaultMessage: 'Agent Builder tool',
        }),
      },
    ];
    for (const template of templatesData?.templates ?? []) {
      if (template.kind === 'task_provider') {
        options.push({ value: template.id, label: template.name });
      }
    }
    return options;
  }, [templatesData?.templates]);

  const buildRequestBody = useCallback((): RunExperimentRequest => {
    return {
      name: name.trim() || undefined,
      connector_ids: connectorIds,
      agent_id: taskTarget === 'agentBuilder.converse' ? agentId.trim() || undefined : undefined,
      tool_id: taskTarget === 'agentBuilder.tool' ? toolId.trim() || undefined : undefined,
      task_ref: !isBuiltInTarget(taskTarget) ? taskTarget : undefined,
      dataset_ids: datasetIds,
      evaluators: evaluators.map((e) => ({
        name: e.name,
        version: e.version,
        connector_id: e.kind === 'llm' ? e.connectorId : undefined,
      })),
      repetitions,
      concurrency,
      compare: compare || undefined,
    };
  }, [
    name,
    connectorIds,
    taskTarget,
    agentId,
    toolId,
    datasetIds,
    evaluators,
    repetitions,
    concurrency,
    compare,
  ]);

  const labelsFor = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>, ids: string[]): string[] =>
      ids.map((id) => options.find((option) => option.value === id)?.label ?? id),
    []
  );

  const buildLaunchedConfig = useCallback(
    (): LaunchedExperimentConfig => ({
      name: name.trim() || undefined,
      target_label:
        taskTargetOptions.find((option) => option.value === taskTarget)?.label ?? taskTarget,
      agent_id: taskTarget === 'agentBuilder.converse' ? agentId.trim() || undefined : undefined,
      tool_id: taskTarget === 'agentBuilder.tool' ? toolId.trim() || undefined : undefined,
      connector_names: labelsFor(connectorOptions, connectorIds),
      dataset_names: labelsFor(datasetOptions, datasetIds),
      evaluator_names: evaluators.map((evaluator) => evaluator.name),
      repetitions,
      concurrency,
    }),
    [
      name,
      taskTargetOptions,
      taskTarget,
      agentId,
      toolId,
      labelsFor,
      connectorOptions,
      connectorIds,
      datasetOptions,
      datasetIds,
      evaluators,
      repetitions,
      concurrency,
    ]
  );

  const missingJudge = evaluators.some((e) => e.kind === 'llm' && !e.connectorId);
  const missingAgent = taskTarget === 'agentBuilder.converse' && !agentId.trim();
  const missingTool = taskTarget === 'agentBuilder.tool' && !toolId.trim();
  const isValid =
    connectorIds.length > 0 &&
    datasetIds.length > 0 &&
    evaluators.length > 0 &&
    !missingJudge &&
    !missingAgent &&
    !missingTool;

  const onToggleYaml = useCallback(
    (next: boolean) => {
      setShowYaml(next);
      if (next && isValid) {
        preview.mutate(buildRequestBody());
      }
    },
    [buildRequestBody, isValid, preview]
  );

  const onToggleCompare = useCallback(
    (next: boolean) => {
      setCompare(next);
      // Reflect the change in the live YAML preview without waiting for the next
      // render (state updates are async, so pass the new value explicitly).
      if (showYaml && isValid) {
        preview.mutate({ ...buildRequestBody(), compare: next || undefined });
      }
    },
    [buildRequestBody, isValid, preview, showYaml]
  );

  const onSelectEvaluators = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      const byName = new Map(evaluators.map((e) => [e.name, e]));
      const definitions = evaluatorsData?.evaluators ?? [];
      const next: SelectedEvaluator[] = [];
      for (const option of selected) {
        const definition = definitions.find((d) => d.name === option.value);
        if (!definition) {
          continue;
        }
        next.push({
          name: definition.name,
          version: definition.version,
          kind: definition.kind,
          connectorId: byName.get(definition.name)?.connectorId,
        });
      }
      setEvaluators(next);
    },
    [evaluators, evaluatorsData?.evaluators]
  );

  const setEvaluatorConnector = useCallback((evaluatorName: string, connectorId: string) => {
    setEvaluators((prev) =>
      prev.map((e) =>
        e.name === evaluatorName ? { ...e, connectorId: connectorId || undefined } : e
      )
    );
  }, []);

  const onRunNow = useCallback(() => {
    runExperiment.mutate(buildRequestBody(), {
      onSuccess: (result) => {
        toasts?.addSuccess(
          i18n.translate('xpack.evals.newExperiment.runSuccess', {
            defaultMessage:
              'Launched {count, plural, one {# workflow execution} other {# workflow executions}}.',
            values: { count: result.workflow_execution_ids.length },
          })
        );
        onClose();

        // Cross-model runs fan out into one experiment (and one list row) per
        // model, each with its own execution id. There is no single experiment to
        // land on, so route to the run overview, which shows per-model progress and
        // links to each model's detail (and a compare action) once results land.
        if (result.executions.length > 1) {
          const params = new URLSearchParams({
            workflow_execution_id: result.executions.map((e) => e.workflow_execution_id).join(','),
            execution_id: result.executions.map((e) => e.execution_id).join(','),
            connector: result.executions.map((e) => e.connector_id).join(','),
          });
          history.push({
            pathname: '/runs',
            search: `?${params.toString()}`,
            state: {
              experimentConfig: buildLaunchedConfig(),
              connectorNamesById: Object.fromEntries(
                connectorIds.map((id) => [
                  id,
                  connectorOptions.find((o) => o.value === id)?.label ?? id,
                ])
              ),
            },
          });
          return;
        }

        // Single / dataset-fanout runs share one experiment id and execution id, so
        // land on the experiment detail page. WorkflowRunProgress renders one card
        // per launched execution while the run is in flight.
        const detailPathId = result.experiment_ids[0] ?? result.execution_id;
        const params = new URLSearchParams({ execution_id: result.execution_id });
        if (result.workflow_execution_ids.length > 0) {
          params.set('workflow_execution_id', result.workflow_execution_ids.join(','));
        }
        history.push({
          pathname: `/experiments/${encodeURIComponent(detailPathId)}`,
          search: `?${params.toString()}`,
          // Carry the submitted form so the detail page can show the config
          // while the run has not yet produced queryable results.
          state: { experimentConfig: buildLaunchedConfig() },
        });
      },
      onError: (error) => {
        toasts?.addError(error as Error, {
          title: i18n.translate('xpack.evals.newExperiment.runError', {
            defaultMessage: 'Failed to launch experiment',
          }),
        });
      },
    });
  }, [
    buildLaunchedConfig,
    buildRequestBody,
    connectorIds,
    connectorOptions,
    history,
    onClose,
    runExperiment,
    toasts,
  ]);

  const onSave = useCallback(() => {
    saveWorkflow.mutate(buildRequestBody(), {
      onSuccess: (result) => {
        toasts?.addSuccess(
          i18n.translate('xpack.evals.newExperiment.saveSuccess', {
            defaultMessage: 'Saved workflow "{name}".',
            values: { name: result.name },
          })
        );
        onClose();
      },
      onError: (error) => {
        toasts?.addError(error as Error, {
          title: i18n.translate('xpack.evals.newExperiment.saveError', {
            defaultMessage: 'Failed to save workflow',
          }),
        });
      },
    });
  }, [buildRequestBody, onClose, saveWorkflow, toasts]);

  const selectedConnectorOptions = connectorOptions.filter((o) =>
    connectorIds.includes(o.value as string)
  );
  const selectedDatasetOptions = datasetOptions.filter((o) =>
    datasetIds.includes(o.value as string)
  );
  const selectedEvaluatorOptions = evaluatorOptions.filter((o) =>
    evaluators.some((e) => e.name === o.value)
  );
  const selectedAgentOptions = agentId
    ? [agentOptions.find((o) => o.value === agentId) ?? { label: agentId, value: agentId }]
    : [];

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus data-test-subj="evalsNewExperimentFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{strings.title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form">
          <EuiFormRow label={strings.nameLabel} fullWidth>
            <EuiFieldText
              fullWidth
              value={name}
              placeholder={strings.namePlaceholder}
              onChange={(e) => setName(e.target.value)}
              data-test-subj="evalsExperimentName"
            />
          </EuiFormRow>

          <EuiFormRow label={strings.connectorsLabel} helpText={strings.connectorsHelp} fullWidth>
            <EuiComboBox<string>
              fullWidth
              isLoading={connectorsLoading}
              options={connectorOptions}
              selectedOptions={selectedConnectorOptions}
              onChange={(selected) => setConnectorIds(selected.map((o) => o.value as string))}
              data-test-subj="evalsConnectorsCombo"
            />
          </EuiFormRow>

          <EuiFormRow label={strings.taskTargetLabel} fullWidth>
            <EuiComboBox<string>
              fullWidth
              singleSelection={{ asPlainText: true }}
              isClearable={false}
              options={taskTargetOptions}
              selectedOptions={taskTargetOptions.filter((o) => o.value === taskTarget)}
              onChange={(selected) => {
                const next = selected[0]?.value;
                if (next) setTaskTarget(next);
              }}
              data-test-subj="evalsTaskTargetSelect"
            />
          </EuiFormRow>

          {taskTarget === 'agentBuilder.converse' && (
            <EuiFormRow label={strings.agentIdLabel} helpText={strings.agentIdHelp} fullWidth>
              <EuiComboBox<string>
                fullWidth
                singleSelection={{ asPlainText: true }}
                isClearable
                isLoading={agentsLoading}
                options={agentOptions}
                selectedOptions={selectedAgentOptions}
                onChange={(selected) => setAgentId((selected[0]?.value as string) ?? '')}
                onCreateOption={(value) => setAgentId(value.trim())}
                data-test-subj="evalsAgentId"
              />
            </EuiFormRow>
          )}

          {taskTarget === 'agentBuilder.tool' && (
            <EuiFormRow label={strings.toolIdLabel} fullWidth>
              <EuiFieldText
                fullWidth
                value={toolId}
                onChange={(e) => setToolId(e.target.value)}
                data-test-subj="evalsToolId"
              />
            </EuiFormRow>
          )}

          <EuiFormRow label={strings.datasetsLabel} fullWidth>
            <EuiComboBox<string>
              fullWidth
              isLoading={datasetsLoading}
              options={datasetOptions}
              selectedOptions={selectedDatasetOptions}
              onChange={(selected) => setDatasetIds(selected.map((o) => o.value as string))}
              data-test-subj="evalsDatasetsCombo"
            />
          </EuiFormRow>

          <EuiFormRow label={strings.evaluatorsLabel} fullWidth>
            <EuiComboBox<string>
              fullWidth
              isLoading={evaluatorsLoading}
              options={evaluatorOptions}
              selectedOptions={selectedEvaluatorOptions}
              onChange={onSelectEvaluators}
              data-test-subj="evalsEvaluatorsCombo"
            />
          </EuiFormRow>

          {evaluators
            .filter((e) => e.kind === 'llm')
            .map((evaluator) => (
              <EuiFormRow
                key={evaluator.name}
                label={i18n.translate('xpack.evals.newExperiment.judgeForLabel', {
                  defaultMessage: '{name} — judge connector',
                  values: { name: evaluator.name },
                })}
                fullWidth
                isInvalid={!evaluator.connectorId}
              >
                <EuiComboBox<string>
                  fullWidth
                  singleSelection={{ asPlainText: true }}
                  isClearable={false}
                  isInvalid={!evaluator.connectorId}
                  isLoading={connectorsLoading}
                  options={connectorOptions}
                  selectedOptions={
                    evaluator.connectorId
                      ? connectorOptions.filter((o) => o.value === evaluator.connectorId)
                      : []
                  }
                  onChange={(selected) =>
                    setEvaluatorConnector(evaluator.name, (selected[0]?.value as string) ?? '')
                  }
                  data-test-subj={`evalsJudgeConnector-${evaluator.name}`}
                />
              </EuiFormRow>
            ))}

          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow label={strings.repetitionsLabel}>
                <EuiFieldNumber
                  min={1}
                  value={repetitions ?? ''}
                  onChange={(e) =>
                    setRepetitions(e.target.value ? Number(e.target.value) : undefined)
                  }
                  data-test-subj="evalsRepetitions"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label={strings.concurrencyLabel}>
                <EuiFieldNumber
                  min={1}
                  value={concurrency ?? ''}
                  onChange={(e) =>
                    setConcurrency(e.target.value ? Number(e.target.value) : undefined)
                  }
                  data-test-subj="evalsConcurrency"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          {isCrossModel && (
            <>
              <EuiSpacer size="m" />
              <EuiSwitch
                label={strings.compareLabel}
                checked={compare}
                onChange={(e) => onToggleCompare(e.target.checked)}
                data-test-subj="evalsCompareToggle"
              />
              <EuiText size="xs" color="subdued">
                <EuiSpacer size="xs" />
                {strings.compareHelp}
              </EuiText>
            </>
          )}

          <EuiSpacer size="m" />
          <EuiSwitch
            label={strings.showYaml}
            checked={showYaml}
            onChange={(e) => onToggleYaml(e.target.checked)}
            data-test-subj="evalsShowYamlToggle"
          />
          {showYaml && (
            <>
              <EuiSpacer size="s" />
              <EuiPanel color="subdued" paddingSize="s" hasShadow={false} hasBorder>
                <YamlPreview
                  yaml={preview.data?.yaml}
                  isLoading={preview.isLoading}
                  error={
                    preview.error
                      ? String((preview.error as Error).message ?? preview.error)
                      : !isValid
                      ? i18n.translate('xpack.evals.newExperiment.previewIncomplete', {
                          defaultMessage:
                            'Select at least one connector, dataset, and evaluator to preview the YAML.',
                        })
                      : undefined
                  }
                />
              </EuiPanel>
            </>
          )}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose}>
              {strings.cancel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="save"
                  isLoading={saveWorkflow.isLoading}
                  isDisabled={!isValid || runExperiment.isLoading}
                  onClick={onSave}
                  data-test-subj="evalsSaveWorkflowButton"
                >
                  {strings.saveAsWorkflow}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  iconType="play"
                  isLoading={runExperiment.isLoading}
                  isDisabled={!isValid || saveWorkflow.isLoading}
                  onClick={onRunNow}
                  data-test-subj="evalsRunNowButton"
                >
                  {strings.runNow}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {!isValid && (
          <EuiText size="xs" color="subdued" textAlign="right">
            <EuiSpacer size="xs" />
            {i18n.translate('xpack.evals.newExperiment.validationHint', {
              defaultMessage:
                'Requires at least one connector, dataset, and evaluator (with a judge connector for LLM evaluators).',
            })}
          </EuiText>
        )}
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
