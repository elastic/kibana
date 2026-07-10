/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiEmptyPrompt,
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
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  LaunchedExperimentConfig,
  RunExperimentRequest,
  SaveAsWorkflowResponse,
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
import { useAccessibleSpaces } from '../../hooks/use_spaces';
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
  spacesLabel: i18n.translate('xpack.evals.newExperiment.spacesLabel', {
    defaultMessage: 'Spaces',
  }),
  spacesHelp: i18n.translate('xpack.evals.newExperiment.spacesHelp', {
    defaultMessage:
      'Spaces this experiment is visible in. Defaults to the current space, but you can add others to share the results with them.',
  }),
  showYaml: i18n.translate('xpack.evals.newExperiment.showYaml', {
    defaultMessage: 'Show workflow YAML',
  }),
  compareLabel: i18n.translate('xpack.evals.newExperiment.compareLabel', {
    defaultMessage: 'Add model comparison step',
  }),
  compareHelp: i18n.translate('xpack.evals.newExperiment.compareHelp', {
    defaultMessage:
      'Adds a step to the saved workflow (shown in the YAML preview) that compares results across the selected models. "Run now" doesn\'t need this step — you can compare models from the run overview instead.',
  }),
  runNow: i18n.translate('xpack.evals.newExperiment.runNow', { defaultMessage: 'Run now' }),
  saveAsWorkflow: i18n.translate('xpack.evals.newExperiment.saveAsWorkflow', {
    defaultMessage: 'Save as workflow',
  }),
  savedBody: i18n.translate('xpack.evals.newExperiment.savedBody', {
    defaultMessage:
      'Your experiment is saved as a reusable workflow. Run it now to see results here, or open it in Workflows to run it later, schedule it, or edit it.',
  }),
  savedRunIt: i18n.translate('xpack.evals.newExperiment.savedRunIt', {
    defaultMessage: 'Run it now',
  }),
  savedOpen: i18n.translate('xpack.evals.newExperiment.savedOpen', {
    defaultMessage: 'Open in Workflows',
  }),
  savedClose: i18n.translate('xpack.evals.newExperiment.savedClose', { defaultMessage: 'Close' }),
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
  const flyoutTitleId = useGeneratedHtmlId();

  const { data: connectorsData, isLoading: connectorsLoading } = useModelConnectors();
  const { data: datasetsData, isLoading: datasetsLoading } = useDatasets({ perPage: 1000 });
  const { data: evaluatorsData, isLoading: evaluatorsLoading } = useEvaluators();
  const { data: templatesData } = useExperimentTemplates();

  const runExperiment = useRunExperiment();
  const saveWorkflow = useSaveExperimentWorkflow();
  // Set once "Save as workflow" succeeds. Flips the flyout from the form to a
  // success state so the just-created workflow isn't a dead-end (open/run it).
  const [savedWorkflow, setSavedWorkflow] = useState<SaveAsWorkflowResponse | null>(null);
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
  const [spaceIds, setSpaceIds] = useState<string[]>([]);

  const {
    isEnabled: spacesEnabled,
    isLoading: spacesLoading,
    activeSpaceId,
    spaces,
  } = useAccessibleSpaces();
  // Default the picker to the current space once it resolves. A ref (not the
  // selection itself) guards the one-time default so the user can later clear the
  // field without it snapping back.
  const spacesInitialized = useRef(false);
  useEffect(() => {
    if (!spacesInitialized.current && activeSpaceId) {
      setSpaceIds([activeSpaceId]);
      spacesInitialized.current = true;
    }
  }, [activeSpaceId]);

  const isCrossModel = connectorIds.length >= 2;
  // A bare tool run is a single `execute_tool` span, so evaluators that only make
  // sense on a conversation trace (e.g. groundedness) are hidden for this target.
  const isBareToolTarget = taskTarget === 'agentBuilder.tool';

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
      (evaluatorsData?.evaluators ?? [])
        .filter((e) => !isBareToolTarget || e.supports_bare_tool_trace !== false)
        .map((e) => ({
          label: e.kind === 'llm' ? `${e.name} (LLM)` : e.name,
          value: e.name,
        })),
    [evaluatorsData, isBareToolTarget]
  );

  useEffect(() => {
    if (!isBareToolTarget) {
      return;
    }
    const unsupported = new Set(
      (evaluatorsData?.evaluators ?? [])
        .filter((e) => e.supports_bare_tool_trace === false)
        .map((e) => e.name)
    );
    if (unsupported.size === 0) {
      return;
    }
    setEvaluators((prev) => {
      const next = prev.filter((e) => !unsupported.has(e.name));
      return next.length === prev.length ? prev : next;
    });
  }, [isBareToolTarget, evaluatorsData]);
  const agentOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      (agentsData ?? []).map((agent) => ({
        label: agent.name && agent.name !== agent.id ? `${agent.name} (${agent.id})` : agent.id,
        value: agent.id,
      })),
    [agentsData]
  );

  const spaceOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      spaces.map((space) => ({
        value: space.id,
        label:
          space.id === activeSpaceId
            ? i18n.translate('xpack.evals.newExperiment.currentSpaceOption', {
                defaultMessage: '{name} (current)',
                values: { name: space.name },
              })
            : space.name,
      })),
    [spaces, activeSpaceId]
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

  // Only send `space_ids` when the user targets spaces beyond the current one.
  // Leaving the default (just the current space, or nothing) omits it so saved
  // workflows stay portable and stamp whichever space they run in.
  const isDefaultSpaceSelection =
    spaceIds.length === 0 || (spaceIds.length === 1 && spaceIds[0] === activeSpaceId);

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
      space_ids: spacesEnabled && !isDefaultSpaceSelection ? spaceIds : undefined,
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
    spacesEnabled,
    isDefaultSpaceSelection,
    spaceIds,
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

  // Keep the YAML preview live: while the toggle is on and the form is valid,
  // (re)generate it whenever any field changes — debounced so we don't hit the
  // preview endpoint on every keystroke. This also covers turning the toggle on
  // before the form is complete: the preview appears as soon as it becomes valid.
  const { mutate: mutatePreview } = preview;
  useEffect(() => {
    if (!showYaml || !isValid) {
      return;
    }
    const handle = window.setTimeout(() => mutatePreview(buildRequestBody()), 300);
    return () => window.clearTimeout(handle);
  }, [showYaml, isValid, buildRequestBody, mutatePreview]);

  const onToggleYaml = useCallback((next: boolean) => setShowYaml(next), []);

  const onToggleCompare = useCallback((next: boolean) => setCompare(next), []);

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
    const requestBody: RunExperimentRequest = {
      ...buildRequestBody(),
      // When launching a just-saved workflow ("Run it now"), correlate the run
      // with it so it shows up under the saved workflow and updates its "Last
      // run". Plain "Run now" (no saved workflow yet) stays ad-hoc.
      ...(savedWorkflow ? { workflow_id: savedWorkflow.workflow_id } : {}),
    };
    runExperiment.mutate(requestBody, {
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
              experimentRequest: requestBody,
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
          state: { experimentConfig: buildLaunchedConfig(), experimentRequest: requestBody },
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
    savedWorkflow,
    toasts,
  ]);

  const onSave = useCallback(() => {
    saveWorkflow.mutate(buildRequestBody(), {
      onSuccess: (result) => {
        // Don't dead-end on an auto-dismissing toast: keep the flyout open and
        // switch to a success state that lets the user open the saved workflow
        // (to run/schedule/edit) or run it right away.
        setSavedWorkflow(result);
      },
      onError: (error) => {
        toasts?.addError(error as Error, {
          title: i18n.translate('xpack.evals.newExperiment.saveError', {
            defaultMessage: 'Failed to save workflow',
          }),
        });
      },
    });
  }, [buildRequestBody, saveWorkflow, toasts]);

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
  const selectedSpaceOptions = spaceOptions.filter((o) => spaceIds.includes(o.value as string));

  // Deep-link to the saved workflow's detail page in the Workflows app, where it
  // can be run, scheduled, edited, and its execution history reviewed.
  const savedWorkflowHref =
    savedWorkflow && services.http
      ? services.http.basePath.prepend(
          `/app/workflows/${encodeURIComponent(savedWorkflow.workflow_id)}`
        )
      : undefined;

  if (savedWorkflow) {
    return (
      <EuiFlyout
        onClose={onClose}
        size="m"
        ownFocus
        aria-labelledby={flyoutTitleId}
        data-test-subj="evalsNewExperimentFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={flyoutTitleId}>{strings.title}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiEmptyPrompt
            iconType="checkInCircleFilled"
            iconColor="success"
            title={
              <h2>
                {i18n.translate('xpack.evals.newExperiment.savedTitle', {
                  defaultMessage: 'Saved workflow "{name}"',
                  values: { name: savedWorkflow.name },
                })}
              </h2>
            }
            body={<p>{strings.savedBody}</p>}
            actions={[
              <EuiButton
                key="run"
                fill
                iconType="play"
                onClick={onRunNow}
                isLoading={runExperiment.isLoading}
                data-test-subj="evalsSavedRunItButton"
              >
                {strings.savedRunIt}
              </EuiButton>,
              ...(savedWorkflowHref
                ? [
                    <EuiButton
                      key="open"
                      iconType="popout"
                      href={savedWorkflowHref}
                      data-test-subj="evalsSavedOpenWorkflowButton"
                    >
                      {strings.savedOpen}
                    </EuiButton>,
                  ]
                : []),
            ]}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} data-test-subj="evalsSavedCloseButton">
                {strings.savedClose}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      ownFocus
      aria-labelledby={flyoutTitleId}
      data-test-subj="evalsNewExperimentFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{strings.title}</h2>
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

          {spacesEnabled && (
            <>
              <EuiSpacer size="m" />
              <EuiFormRow label={strings.spacesLabel} helpText={strings.spacesHelp} fullWidth>
                <EuiComboBox<string>
                  fullWidth
                  isLoading={spacesLoading}
                  options={spaceOptions}
                  selectedOptions={selectedSpaceOptions}
                  onChange={(selected) => setSpaceIds(selected.map((o) => o.value as string))}
                  data-test-subj="evalsSpacesCombo"
                />
              </EuiFormRow>
            </>
          )}

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
              {isValid ? (
                <YamlPreview
                  yaml={preview.data?.yaml}
                  // The form is valid here, so treat the pre-first-result window
                  // (debounce + in-flight request) as loading rather than flashing
                  // the "complete the form" empty state.
                  isLoading={preview.isLoading || (!preview.data && !preview.error)}
                  error={
                    preview.error
                      ? String((preview.error as Error).message ?? preview.error)
                      : undefined
                  }
                />
              ) : (
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.evals.newExperiment.previewIncomplete', {
                    defaultMessage:
                      'Select at least one connector, dataset, and evaluator to preview the YAML.',
                  })}
                </EuiText>
              )}
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
