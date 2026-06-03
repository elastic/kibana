/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebounceFn } from '@kbn/react-hooks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { RuleFormProvider } from '../../form/contexts/rule_form_context';
import type { FormValues, RuleNotificationsValue } from '../../form/types';
import { mergeArtifactsByType, splitArtifactsByType } from '../../form/utils/artifact_mappers';
import { parseYamlToFormValues, serializeFormToYaml } from '../../form/utils/yaml_form_utils';
import { ComposeDiscoverForm, getSteps } from './compose_discover_form';
import type { ComposeFormValues, RuleQuery } from './compose_form_types';
import { getBreachQuery } from './compose_form_types';
import {
  composeFormToCreateRequest,
  composeFormToUpdateRequest,
  mapRuleToComposeFormValues,
  transformQueryIn,
  transformQueryOut,
} from './compose_mappers';
import { HorizontalMinimalStepper, type MinimalStep } from './horizontal_minimal_stepper';
import { QuerySandboxFlyout } from './query_sandbox_flyout';
import { RULE_BUILDER_REGISTRY, BuilderStateProvider, type BuilderState } from './rule_builder';
import type { ComposeDiscoverMode, QueryTab, RecoveryType } from './types';
import { getSandboxTabs, useComposeDiscoverState } from './use_compose_discover_state';
import { useEsqlAutocomplete } from './use_esql_providers';
import { guessRecoveryBlock, splitQuery } from './use_heuristic_split';
import { useSplitQueryCompletion } from './use_split_query_completion';

const LazyYamlRuleForm = React.lazy(() =>
  import('../../form/yaml_rule_form').then((m) => ({ default: m.YamlRuleForm }))
);

// ── Translated phrases ────────────────────────────────────────────────────────

const FORM_VIEW_LABEL = i18n.translate('xpack.alertingV2.composeDiscover.editMode.form', {
  defaultMessage: 'Form view',
});

const YAML_VIEW_LABEL = i18n.translate('xpack.alertingV2.composeDiscover.editMode.yaml', {
  defaultMessage: 'YAML view',
});

const YAML_MODE_BADGE_LABEL = i18n.translate('xpack.alertingV2.composeDiscover.yamlMode.badge', {
  defaultMessage: 'YAML MODE',
});

const EDIT_MODE_LEGEND = i18n.translate('xpack.alertingV2.composeDiscover.editMode.legend', {
  defaultMessage: 'Edit mode selection',
});

const CLONE_TITLE = i18n.translate('xpack.alertingV2.composeDiscover.flyout.cloneTitleLabel', {
  defaultMessage: 'Clone alert rule',
});

const CREATE_TITLE = i18n.translate('xpack.alertingV2.composeDiscover.flyout.createTitleLabel', {
  defaultMessage: 'Create alert rule',
});

const EDIT_TITLE = i18n.translate('xpack.alertingV2.composeDiscover.flyout.editTitleLabel', {
  defaultMessage: 'Edit alert rule',
});

const CREATE_RULE_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.createButtonLabel',
  { defaultMessage: 'Create rule' }
);

const SAVE_RULE_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.saveButtonLabel',
  { defaultMessage: 'Save rule' }
);

const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.cancelButtonLabel',
  { defaultMessage: 'Cancel' }
);

const BACK_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.backButtonLabel',
  { defaultMessage: 'Back' }
);

const NEXT_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.nextButtonLabel',
  { defaultMessage: 'Next' }
);

const NEXT_DISABLED_TOOLTIP = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.nextDisabledTooltip',
  { defaultMessage: 'Define a query in the editor before continuing' }
);

const EDIT_MODE_OPTIONS = [
  { id: 'form', label: FORM_VIEW_LABEL, iconType: 'tableDensityNormal' },
  { id: 'yaml', label: YAML_VIEW_LABEL, iconType: 'editorCodeBlock' },
];

const getFlyoutTitle = (mode: ComposeDiscoverMode): string => {
  if (mode === 'clone') return CLONE_TITLE;
  if (mode === 'edit') return EDIT_TITLE;
  return CREATE_TITLE;
};

// These hooks live in the plugin, not the package — imported via the plugin's hook layer
// when this flyout is rendered in the rules list page.
// For now they are passed as props to keep the package boundary clean.
export interface ComposeDiscoverFlyoutProps<TWorkflow extends object = object> {
  historyKey: symbol;
  mode?: ComposeDiscoverMode;
  /** The existing rule — provided when mode === 'edit'. Used to seed the RHF form. */
  rule?: Parameters<typeof mapRuleToComposeFormValues>[0];
  /** The ID of the rule being edited. Required when mode === 'edit'. */
  ruleId?: string;
  onClose: () => void;
  services: RuleFormServices<TWorkflow>;
  /**
   * Called with the create payload when the user submits in create mode. When the user
   * enables the notifications step, `notifications` carries the captured workflow value;
   * otherwise it is `undefined`. The cast to `RuleNotificationsValue<TWorkflow>` is safe
   * because the workflow value was seeded by `services.workflowForm.defaultValue()`.
   */
  onCreateRule: (
    payload: ReturnType<typeof composeFormToCreateRequest>,
    notifications?: RuleNotificationsValue<TWorkflow>
  ) => void;
  /** Called with id + update payload when the user submits in edit mode. */
  onUpdateRule?: (id: string, payload: ReturnType<typeof composeFormToUpdateRequest>) => void;
  /** True while a create/update mutation is in flight. */
  isSaving?: boolean;
  builderType?: string;
  initialBuilderState?: BuilderState;
}

const FLYOUT_TITLE_ID = 'composeDiscoverFlyoutTitle';
const YAML_PARSE_DEBOUNCE_OPTIONS = { wait: 300 } as const;

const getStepStatus = (currentStep: number, stepIndex: number): MinimalStep['status'] => {
  if (stepIndex < currentStep) return 'complete';
  if (stepIndex === currentStep) return 'current';
  return 'incomplete';
};

/** Bridge YAML parse (FormValues) into compose form shape until yaml_form_utils adopts ComposeFormValues. */
const formValuesFromYamlToCompose = (parsed: FormValues): ComposeFormValues => ({
  kind: parsed.kind,
  metadata: parsed.metadata,
  timeField: parsed.timeField,
  schedule: parsed.schedule,
  query: transformQueryIn({
    kind: parsed.kind,
    evaluation: parsed.evaluation,
    ...(parsed.recoveryPolicy?.type === 'query' &&
    parsed.recoveryPolicy.query?.base !== undefined &&
    parsed.recoveryPolicy.query?.base !== null
      ? {
          recovery_policy: {
            type: parsed.recoveryPolicy.type,
            query: {
              base: parsed.recoveryPolicy.query.base ?? '',
            },
          },
        }
      : {}),
  }),
  grouping: parsed.grouping,
  stateTransition: parsed.stateTransition,
  stateTransitionAlertDelayMode: parsed.stateTransitionAlertDelayMode,
  stateTransitionRecoveryDelayMode: parsed.stateTransitionRecoveryDelayMode,
  ...splitArtifactsByType(parsed.artifacts),
});

/** Compose form → legacy FormValues for YAML serialization via yaml_form_utils. */
const composeFormValuesForYamlSerialize = (compose: ComposeFormValues): FormValues => {
  const { evaluation, recovery_policy } = transformQueryOut(compose.query, compose.kind);

  return {
    kind: compose.kind,
    metadata: compose.metadata,
    timeField: compose.timeField,
    schedule: compose.schedule,
    evaluation,
    grouping: compose.grouping,
    ...(recovery_policy ? { recoveryPolicy: recovery_policy } : {}),
    stateTransition: compose.stateTransition,
    stateTransitionAlertDelayMode: compose.stateTransitionAlertDelayMode,
    stateTransitionRecoveryDelayMode: compose.stateTransitionRecoveryDelayMode,
    artifacts: mergeArtifactsByType(compose),
  };
};

const EMPTY_FORM_VALUES: ComposeFormValues = {
  kind: 'signal',
  metadata: { name: '', enabled: true, description: '', tags: [] },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: '' },
  grouping: undefined,
  stateTransition: undefined,
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
  artifacts: [],
  runbookArtifacts: [],
  dashboardArtifacts: [],
};

export function ComposeDiscoverFlyout<TWorkflow extends object = object>({
  historyKey,
  mode = 'create',
  rule,
  ruleId,
  onClose,
  services,
  onCreateRule,
  onUpdateRule,
  isSaving = false,
  builderType,
  initialBuilderState,
}: ComposeDiscoverFlyoutProps<TWorkflow>): React.ReactElement | null {
  const isBuilderMode = Boolean(builderType);
  /*
   * ── UI state (step navigation, sandbox open/close, tab selection, etc.) ──
   * In edit mode, seed the sandbox draft with the rule's existing query so the
   * Alert Condition step shows the current query summary instead of "No query defined".
   * When the persisted rule has a custom recovery query, the initial state
   * infers that tracking was active and reconstructs the split.
   */
  // Internal alias: typed-down to the base `RuleFormServices` for sub-components that
  // don't need the concrete `TWorkflow`. The typed boundary lives in `onCreateRule`.
  const baseServices = services as unknown as RuleFormServices;

  const initialMapped =
    (mode === 'edit' || mode === 'clone') && rule ? mapRuleToComposeFormValues(rule) : undefined;
  const initialKind = initialMapped?.kind ?? 'signal';
  const hasInitialCustomRecovery =
    initialMapped?.query?.format === 'composed' && !!initialMapped.query.blocks.recover?.trim();
  const [uiState, dispatch] = useComposeDiscoverState({
    mode: mode === 'clone' ? 'edit' : mode,
    initialKind,
    initialRecoveryType: hasInitialCustomRecovery ? 'custom' : 'default',
    isBuilderMode,
  });

  // Registered once here so providers persist across Sandbox open/close cycles.
  useEsqlAutocomplete(baseServices);

  const [builderState, setBuilderState] = useState<BuilderState>(() => {
    if (!builderType) return undefined;
    if (initialBuilderState !== undefined) return initialBuilderState;
    const definition = RULE_BUILDER_REGISTRY[builderType];
    return definition ? definition.createDefaultState() : undefined;
  });

  // ── Form values (submitted to the API) ──
  const defaultValues = useMemo<ComposeFormValues>(() => {
    if (!rule) return EMPTY_FORM_VALUES;
    const mapped = mapRuleToComposeFormValues(rule);
    if (mode === 'clone') {
      return {
        ...mapped,
        metadata: {
          ...mapped.metadata,
          name: `${mapped.metadata.name} (clone)`,
        },
      };
    }
    return mapped;
  }, [rule, mode]);

  const methods = useForm<ComposeFormValues>({ mode: 'onBlur', defaultValues });

  const [sandboxQuery, setSandboxQuery] = useState<RuleQuery>(() => methods.getValues('query'));
  const [sandboxTimeField, setSandboxTimeField] = useState<string>(() =>
    methods.getValues('timeField')
  );
  const [dateRange, setDateRange] = useState({ dateStart: 'now-15m', dateEnd: 'now' });

  const syncSandbox = useCallback(() => {
    setSandboxQuery(methods.getValues('query'));
    setSandboxTimeField(methods.getValues('timeField'));
  }, [methods]);

  /*
   * Split-query completion for alert and recovery block editors. Registered at
   * the flyout level so providers survive Sandbox (child) open/close cycles and
   * are immune to React Strict Mode double-mount disposal.
   */
  const sandboxBase = sandboxQuery.format === 'composed' ? sandboxQuery.base : '';
  const { onEditorMount: onAlertEditorMount } = useSplitQueryCompletion({
    baseQuery: sandboxBase,
    search: services.data.search.search,
  });
  const { onEditorMount: onRecoveryEditorMount } = useSplitQueryCompletion({
    baseQuery: sandboxBase,
    search: services.data.search.search,
  });

  const isAlert = useWatch({ control: methods.control, name: 'kind' }) === 'alert';

  const handleKindChange = useCallback(
    (kind: 'signal' | 'alert') => {
      if (kind === 'alert') {
        const full = getBreachQuery(methods.getValues('query'));
        const { base, alertBlock } = splitQuery(full);
        const composed: RuleQuery = { format: 'composed', base, blocks: { breach: alertBlock } };
        setSandboxQuery(composed);
        methods.setValue('query', composed);
      } else {
        // Assemble from committed query — discards any unapplied sandbox edits cleanly.
        const assembled = getBreachQuery(methods.getValues('query'));
        const standalone: RuleQuery = { format: 'standalone', breach: assembled };
        setSandboxQuery(standalone);
        methods.setValue('query', standalone);
      }
      methods.setValue('kind', kind);
      dispatch({ type: 'KIND_CHANGE', kind });
    },
    [methods, dispatch]
  );

  useEffect(() => {
    if (!isBuilderMode) return;
    const sub = methods.watch((values) => {
      if (values.query) setSandboxQuery(values.query as RuleQuery);
      if (values.timeField) setSandboxTimeField(values.timeField);
    });
    return () => sub.unsubscribe();
  }, [isBuilderMode, methods]);

  const handleRecoveryTypeChange = useCallback(
    (type: RecoveryType) => {
      if (type === 'custom') {
        setSandboxQuery((q) => {
          if (q.format !== 'composed') return q;
          const current = q.blocks.recover ?? '';
          if (current.trim()) return q;
          if (isBuilderMode) {
            const formQuery = methods.getValues('query');
            const builderRecover =
              formQuery.format === 'composed' ? formQuery.blocks.recover ?? '' : '';
            if (builderRecover.trim()) {
              return { ...q, blocks: { ...q.blocks, recover: builderRecover } };
            }
          }
          return {
            ...q,
            blocks: {
              ...q.blocks,
              recover: guessRecoveryBlock(q.blocks.breach),
            },
          };
        });
      } else {
        // (a) Clear recover from sandbox regardless of mode — prevents stale recovery
        // query from surviving a type change even when the sandbox is still open.
        setSandboxQuery((q) =>
          q.format === 'composed'
            ? { ...q, blocks: { breach: q.blocks.breach } }
            : { ...q, recover: undefined }
        );
        // Clear recover from committed RHF state too.
        if (uiState.queryCommitted) {
          const current = methods.getValues('query');
          if (current.format === 'composed' && current.blocks.recover) {
            methods.setValue('query', { ...current, blocks: { breach: current.blocks.breach } });
          } else if (current.format === 'standalone' && current.recover) {
            methods.setValue('query', { format: 'standalone', breach: current.breach });
          }
        }
        if (isBuilderMode && builderState) {
          const { recovery: _, ...rest } = builderState as Record<string, unknown>;
          setBuilderState(rest);
        }
        // (b) Close sandbox in non-YAML mode — prevents a pending Apply from
        // overwriting the recovery type change by writing the stale sandboxQuery back.
        // Skip syncSandbox here: (a) already set the clean state directly, and
        // calling syncSandbox when !queryCommitted could re-introduce a stale recover.
        if (uiState.childOpen && !uiState.yamlMode) {
          dispatch({ type: 'CLOSE_CHILD' });
        }
      }
      dispatch({ type: 'SET_RECOVERY_TYPE', recoveryType: type, isBuilderMode });
    },
    [
      dispatch,
      methods,
      isBuilderMode,
      builderState,
      uiState.queryCommitted,
      uiState.childOpen,
      uiState.yamlMode,
    ]
  );

  const isCreate = mode === 'create' || mode === 'clone';
  const isEditing = mode === 'edit';
  const title = getFlyoutTitle(mode);

  const { steps } = getSteps(isAlert, builderType);
  const currentStep = steps[uiState.step];
  const isLastStep = uiState.step === steps.length - 1;

  // ── YAML mode state ──────────────────────────────────────────────────────
  const [yamlText, setYamlText] = useState('');

  // Debounced (~300 ms) lenient parse that pushes every YAML keystroke into RHF.
  // The Sandbox watches RHF via props, so it sees YAML edits live.
  const { run: runYamlParse, cancel: cancelYamlParse } = useDebounceFn((yaml: string) => {
    const result = parseYamlToFormValues(yaml);
    if (result.values) {
      methods.reset(formValuesFromYamlToCompose(result.values));
      syncSandbox();
    }
  }, YAML_PARSE_DEBOUNCE_OPTIONS);

  const handleSetYamlText = useCallback(
    (yaml: string) => {
      setYamlText(yaml);
      runYamlParse(yaml);
    },
    [runYamlParse]
  );

  const handleBlurSync = useCallback(
    (values: FormValues) => {
      cancelYamlParse();
      methods.reset(formValuesFromYamlToCompose(values));
      syncSandbox();
    },
    [cancelYamlParse, methods, syncSandbox]
  );

  const handleToggleYamlMode = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        setYamlText(serializeFormToYaml(composeFormValuesForYamlSerialize(methods.getValues())));
      } else {
        cancelYamlParse();
        const result = parseYamlToFormValues(yamlText);
        if (result.values) {
          const composed = formValuesFromYamlToCompose(result.values);
          methods.reset(composed);
          syncSandbox();
          if (getBreachQuery(composed.query).trim()) {
            dispatch({ type: 'COMMIT_QUERY' });
          }
        }
        // No syncSandbox() on parse-failure path: the debounced parse always calls
        // methods.reset() + syncSandbox() together, so RHF and sandbox state are already in
        // sync at the last valid parse state. The current yamlText simply can't be applied.
      }
      dispatch({ type: 'SET_YAML_MODE', enabled });
    },
    [cancelYamlParse, methods, yamlText, syncSandbox, dispatch]
  );

  const handleSandboxApply = useCallback(() => {
    methods.setValue('query', sandboxQuery);
    methods.setValue('timeField', sandboxTimeField);
    if (uiState.yamlMode) {
      const current = { ...methods.getValues(), query: sandboxQuery, timeField: sandboxTimeField };
      setYamlText(serializeFormToYaml(composeFormValuesForYamlSerialize(current)));
    }
    dispatch({ type: 'COMMIT_QUERY' });
    if (!uiState.yamlMode) {
      dispatch({ type: 'CLOSE_CHILD' });
    }
  }, [sandboxQuery, sandboxTimeField, uiState.yamlMode, methods, dispatch]);

  const handleSubmit = methods.handleSubmit((values) => {
    if (builderType) {
      const definition = RULE_BUILDER_REGISTRY[builderType];
      if (definition?.validate && !definition.validate(uiState, builderState)) {
        return;
      }
    }
    if (isCreate) {
      onCreateRule(
        composeFormToCreateRequest(values, builderType),
        values.notifications as RuleNotificationsValue<TWorkflow> | undefined
      );
    } else if (ruleId && onUpdateRule) {
      onUpdateRule(ruleId, composeFormToUpdateRequest(values, builderType));
    }
  });

  // YAML "Save" — flush any pending debounce into RHF, then run the shared
  // handleSubmit path so validation + submission use a single pipeline.
  const handleYamlSave = useCallback(() => {
    cancelYamlParse();
    const result = parseYamlToFormValues(yamlText);
    if (result.values) {
      methods.reset(formValuesFromYamlToCompose(result.values));
      // No syncSandbox() here: draft is temporarily stale after methods.reset(), but
      // we're about to submit. On success the flyout closes; on failure the user is still
      // in YAML mode and handleToggleYamlMode(false) will resync when they switch back.
    }
    handleSubmit();
  }, [cancelYamlParse, yamlText, methods, handleSubmit]);

  const handleNext = useCallback(async () => {
    if (currentStep?.validate) {
      const valid = await currentStep.validate(methods, uiState, baseServices, builderState);
      if (!valid) return;
    }
    dispatch({ type: 'GO_NEXT', isAlert });
  }, [currentStep, methods, uiState, isAlert, dispatch, baseServices, builderState]);

  const handleFinalSubmit = useCallback(async () => {
    if (currentStep?.validate) {
      const valid = await currentStep.validate(methods, uiState, baseServices, builderState);
      if (!valid) return;
    }
    handleSubmit();
  }, [currentStep, methods, uiState, baseServices, builderState, handleSubmit]);

  // TODO: recoveryType drives whether the recovery tab appears in YAML mode.
  // Follow schema decisions in #268984 — if recoveryType is superseded by a
  // field on RuleQuery itself, gate this on query shape instead.
  const sandboxTabs: QueryTab[] | undefined =
    uiState.yamlMode && sandboxQuery.format === 'composed'
      ? uiState.recoveryType === 'custom'
        ? ['base', 'alert', 'recovery']
        : ['base', 'alert']
      : getSandboxTabs(isAlert, uiState);

  return (
    <RuleFormProvider services={services} meta={{ layout: 'flyout' }}>
      <FormProvider {...methods}>
        <EuiFlyout
          type="overlay"
          session="start"
          historyKey={historyKey}
          onClose={onClose}
          aria-labelledby={FLYOUT_TITLE_ID}
          size={480}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s" id={FLYOUT_TITLE_ID}>
              <h2>{title}</h2>
            </EuiTitle>

            <EuiFlexGroup
              justifyContent="spaceBetween"
              alignItems="center"
              responsive={false}
              style={{ marginTop: 8 }}
            >
              {uiState.yamlMode ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow" data-test-subj="composeDiscoverYamlBadge">
                    {YAML_MODE_BADGE_LABEL}
                  </EuiBadge>
                </EuiFlexItem>
              ) : (
                <EuiFlexItem grow>
                  <HorizontalMinimalStepper
                    steps={steps.map(
                      (s, i): MinimalStep => ({
                        title: s.title,
                        status: getStepStatus(uiState.step, i),
                      })
                    )}
                  />
                </EuiFlexItem>
              )}
              {!isBuilderMode && (
                <EuiFlexItem grow={false}>
                  <EuiButtonGroup
                    legend={EDIT_MODE_LEGEND}
                    options={EDIT_MODE_OPTIONS}
                    idSelected={uiState.yamlMode ? 'yaml' : 'form'}
                    onChange={(id) => handleToggleYamlMode(id === 'yaml')}
                    isIconOnly
                    buttonSize="compressed"
                    data-test-subj="composeDiscoverEditModeToggle"
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            {uiState.yamlMode ? (
              <React.Suspense fallback={null}>
                <LazyYamlRuleForm
                  services={baseServices}
                  yamlText={yamlText}
                  setYamlText={handleSetYamlText}
                  onBlurSync={handleBlurSync}
                  isSubmitting={isSaving}
                />
              </React.Suspense>
            ) : (
              <BuilderStateProvider builderState={builderState} setBuilderState={setBuilderState}>
                <ComposeDiscoverForm
                  state={uiState}
                  dispatch={dispatch}
                  services={baseServices}
                  onRecoveryTypeChange={handleRecoveryTypeChange}
                  onKindChange={handleKindChange}
                  isEditing={isEditing}
                  ruleId={ruleId}
                  builderType={builderType}
                />
              </BuilderStateProvider>
            )}
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            {uiState.yamlMode ? (
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={handleYamlSave}
                    isLoading={isSaving}
                    data-test-subj="composeDiscoverYamlSubmit"
                  >
                    {isCreate ? CREATE_RULE_BUTTON_LABEL : SAVE_RULE_BUTTON_LABEL}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={onClose} data-test-subj="composeDiscoverCancel">
                    {CANCEL_BUTTON_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" responsive={false}>
                    {uiState.step > 0 && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          iconType="arrowLeft"
                          isDisabled={uiState.childOpen}
                          onClick={() => dispatch({ type: 'GO_BACK' })}
                          data-test-subj="composeDiscoverBack"
                        >
                          {BACK_BUTTON_LABEL}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      {isLastStep ? (
                        <EuiButton
                          fill
                          isLoading={isSaving}
                          onClick={handleFinalSubmit}
                          data-test-subj="composeDiscoverSubmit"
                        >
                          {isCreate ? CREATE_RULE_BUTTON_LABEL : SAVE_RULE_BUTTON_LABEL}
                        </EuiButton>
                      ) : (
                        <EuiToolTip
                          content={
                            (currentStep?.id === 'alertCondition' ||
                              currentStep?.id === 'builderCondition') &&
                            !uiState.queryCommitted
                              ? NEXT_DISABLED_TOOLTIP
                              : undefined
                          }
                        >
                          <EuiButton
                            fill
                            iconType="arrowRight"
                            iconSide="right"
                            isDisabled={
                              uiState.childOpen ||
                              ((currentStep?.id === 'alertCondition' ||
                                currentStep?.id === 'builderCondition') &&
                                !uiState.queryCommitted)
                            }
                            onClick={handleNext}
                            data-test-subj="composeDiscoverNext"
                          >
                            {NEXT_BUTTON_LABEL}
                          </EuiButton>
                        </EuiToolTip>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlyoutFooter>

          {uiState.childOpen && (
            <QuerySandboxFlyout
              query={sandboxQuery}
              onQueryChange={isBuilderMode ? undefined : setSandboxQuery}
              tabs={sandboxTabs}
              timeField={sandboxTimeField}
              onTimeFieldChange={isBuilderMode ? undefined : setSandboxTimeField}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              activeTab={uiState.activeTab}
              onTabChange={(tab) => dispatch({ type: 'SET_TAB', tab })}
              onAlertEditorMount={onAlertEditorMount}
              onRecoveryEditorMount={onRecoveryEditorMount}
              onClose={() => {
                syncSandbox();
                dispatch({ type: 'CLOSE_CHILD' });
              }}
              onApply={isBuilderMode ? undefined : handleSandboxApply}
            />
          )}
        </EuiFlyout>
      </FormProvider>
    </RuleFormProvider>
  );
}
