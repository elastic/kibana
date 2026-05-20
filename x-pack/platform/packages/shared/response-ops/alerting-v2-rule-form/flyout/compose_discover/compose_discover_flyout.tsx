/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
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
import type { FormValues } from '../../form/types';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { RuleFormProvider } from '../../form/contexts/rule_form_context';
import { serializeFormToYaml, parseYamlToFormValues } from '../../form/utils/yaml_form_utils';
import type { ComposeFormValues } from './compose_form_types';
import { getBreachQuery } from './compose_form_types';
import {
  mapRuleToComposeFormValues,
  composeFormToCreateRequest,
  composeFormToUpdateRequest,
  transformQueryIn,
  transformQueryOut,
} from './compose_mappers';
import type { ComposeDiscoverMode, RecoveryType } from './types';
import { useComposeDiscoverState, getSandboxTabConfig } from './use_compose_discover_state';
import { ComposeDiscoverForm, getSteps } from './compose_discover_form';
import { HorizontalMinimalStepper, type MinimalStep } from './horizontal_minimal_stepper';
import { QuerySandboxFlyout } from './query_sandbox_flyout';
import { useEsqlAutocomplete } from './use_esql_providers';
import { useSplitQueryCompletion } from './use_split_query_completion';
import { useSandboxDraft, draftToRuleQuery } from './use_sandbox_draft';
import { splitQuery, guessRecoveryBlock } from './use_heuristic_split';

const LazyYamlRuleForm = React.lazy(() =>
  import('../../form/yaml_rule_form').then((m) => ({ default: m.YamlRuleForm }))
);

const EDIT_MODE_OPTIONS = [
  {
    id: 'form',
    label: i18n.translate('xpack.alertingV2.composeDiscover.editMode.form', {
      defaultMessage: 'Form view',
    }),
    iconType: 'tableDensityNormal',
  },
  {
    id: 'yaml',
    label: i18n.translate('xpack.alertingV2.composeDiscover.editMode.yaml', {
      defaultMessage: 'YAML view',
    }),
    iconType: 'editorCodeBlock',
  },
];

// These hooks live in the plugin, not the package — imported via the plugin's hook layer
// when this flyout is rendered in the rules list page.
// For now they are passed as props to keep the package boundary clean.
export interface ComposeDiscoverFlyoutProps {
  historyKey: symbol;
  mode?: ComposeDiscoverMode;
  /** The existing rule — provided when mode === 'edit'. Used to seed the RHF form. */
  rule?: Parameters<typeof mapRuleToComposeFormValues>[0];
  /** The ID of the rule being edited. Required when mode === 'edit'. */
  ruleId?: string;
  onClose: () => void;
  services: RuleFormServices;
  /** Called with the create payload when the user submits in create mode. */
  onCreateRule: (payload: ReturnType<typeof composeFormToCreateRequest>) => void;
  /** Called with id + update payload when the user submits in edit mode. */
  onUpdateRule?: (id: string, payload: ReturnType<typeof composeFormToUpdateRequest>) => void;
  /** True while a create/update mutation is in flight. */
  isSaving?: boolean;
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
  artifacts: parsed.artifacts,
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
    artifacts: compose.artifacts,
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
};

export const ComposeDiscoverFlyout: React.FC<ComposeDiscoverFlyoutProps> = ({
  historyKey,
  mode = 'create',
  rule,
  ruleId,
  onClose,
  services,
  onCreateRule,
  onUpdateRule,
  isSaving = false,
}) => {
  /*
   * ── UI state (step navigation, sandbox open/close, tab selection, etc.) ──
   * In edit mode, seed the sandbox draft with the rule's existing query so the
   * Alert Condition step shows the current query summary instead of "No query defined".
   * When the persisted rule has a custom recovery query, the initial state
   * infers that tracking was active and reconstructs the split.
   */
  const initialMapped =
    (mode === 'edit' || mode === 'clone') && rule ? mapRuleToComposeFormValues(rule) : undefined;
  const initialKind = initialMapped?.kind ?? 'signal';
  const hasInitialCustomRecovery =
    initialMapped?.query?.format === 'composed' && !!initialMapped.query.blocks.recover?.trim();
  const [uiState, dispatch] = useComposeDiscoverState({
    mode: mode === 'clone' ? 'edit' : mode,
    initialKind,
    initialRecoveryType: hasInitialCustomRecovery ? 'custom' : 'default',
  });

  // Registered once here so providers persist across Sandbox open/close cycles.
  useEsqlAutocomplete(services);

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

  const { draft, setDraft, syncForm } = useSandboxDraft(methods);

  /*
   * Split-query completion for alert and recovery block editors. Registered at
   * the flyout level so providers survive Sandbox (child) open/close cycles and
   * are immune to React Strict Mode double-mount disposal.
   */
  const { onEditorMount: onAlertEditorMount } = useSplitQueryCompletion({
    baseQuery: draft.base,
    search: services.data.search.search,
  });
  const { onEditorMount: onRecoveryEditorMount } = useSplitQueryCompletion({
    baseQuery: draft.base,
    search: services.data.search.search,
  });

  // `kind` is the source of truth for tracking. Guard on divergence from uiState.tracking
  // so this effect is a no-op on mount (both sides are seeded from the same initial kind).
  const isAlert = useWatch({ control: methods.control, name: 'kind' }) === 'alert';
  useEffect(() => {
    if (isAlert === uiState.tracking) return;
    if (uiState.yamlMode) return;
    if (isAlert) {
      const full = getBreachQuery(methods.getValues('query'));
      const { base, alertBlock } = splitQuery(full);
      setDraft((d) => ({ ...d, base, breach: alertBlock }));
      methods.setValue('query', { format: 'composed', base, blocks: { breach: alertBlock } });
      dispatch({ type: 'ENABLE_TRACKING' });
    } else {
      // Assemble from the last committed RHF query — not from draft — so
      // any unapplied sandbox edits are discarded cleanly on tracking disable.
      const assembled = getBreachQuery(methods.getValues('query'));
      setDraft((d) => ({ ...d, base: '', breach: assembled, recover: '' }));
      methods.setValue('query', { format: 'standalone', breach: assembled });
      dispatch({ type: 'DISABLE_TRACKING' });
    }
  }, [isAlert, uiState.tracking, uiState.yamlMode, methods, setDraft, dispatch]);

  const handleRecoveryTypeChange = useCallback(
    (type: RecoveryType) => {
      if (type === 'custom') {
        setDraft((d) => ({
          ...d,
          recover: d.recover.trim() ? d.recover : guessRecoveryBlock(d.breach),
        }));
      }
      dispatch({ type: 'SET_RECOVERY_TYPE', recoveryType: type });
    },
    [setDraft, dispatch]
  );

  const isCreate = mode === 'create' || mode === 'clone';
  const title =
    mode === 'clone' ? 'Clone alert rule' : isCreate ? 'Create alert rule' : 'Edit alert rule';

  const steps = getSteps(uiState.tracking);
  const currentStep = steps[uiState.step];
  const isLastStep = uiState.step === steps.length - 1;

  // When recovery type switches to 'default', strip recover from committed RHF query.
  useEffect(() => {
    if (!uiState.queryCommitted || uiState.recoveryType !== 'default') return;
    const current = methods.getValues('query');
    if (current.format === 'composed' && current.blocks.recover) {
      methods.setValue('query', { ...current, blocks: { breach: current.blocks.breach } });
    } else if (current.format === 'standalone' && current.recover) {
      methods.setValue('query', { format: 'standalone', breach: current.breach });
    }
  }, [uiState.recoveryType, uiState.queryCommitted, methods]);

  // ── YAML mode state ──────────────────────────────────────────────────────
  const [yamlText, setYamlText] = useState('');

  // Debounced (~300 ms) lenient parse that pushes every YAML keystroke into RHF.
  // The Sandbox watches RHF via props, so it sees YAML edits live.
  const { run: runYamlParse, cancel: cancelYamlParse } = useDebounceFn((yaml: string) => {
    const result = parseYamlToFormValues(yaml);
    if (result.values) {
      methods.reset(formValuesFromYamlToCompose(result.values));
      syncForm();
    }
  }, YAML_PARSE_DEBOUNCE_OPTIONS);

  const handleSetYamlText = useCallback(
    (yaml: string) => {
      setYamlText(yaml);
      runYamlParse(yaml);
    },
    [runYamlParse]
  );

  const handleToggleYamlMode = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        setYamlText(serializeFormToYaml(composeFormValuesForYamlSerialize(methods.getValues())));
      } else {
        cancelYamlParse();
        const result = parseYamlToFormValues(yamlText);
        if (result.values) {
          const compose = formValuesFromYamlToCompose(result.values);
          methods.reset(compose);
          syncForm();
          dispatch({ type: 'COMMIT_QUERY' });
        }
        // No syncForm() on parse-failure path: the debounced parse always calls
        // methods.reset() + syncForm() together, so RHF and draft are already in
        // sync at the last valid parse state. The current yamlText simply can't be applied.
      }
      dispatch({ type: 'SET_YAML_MODE', enabled });
    },
    [cancelYamlParse, methods, yamlText, syncForm, dispatch]
  );

  const handleSandboxApply = useCallback(() => {
    const updatedQuery = draftToRuleQuery(draft, uiState.tracking);
    methods.setValue('query', updatedQuery);
    methods.setValue('timeField', draft.timeField);
    if (uiState.yamlMode) {
      const current = { ...methods.getValues(), query: updatedQuery, timeField: draft.timeField };
      setYamlText(serializeFormToYaml(composeFormValuesForYamlSerialize(current)));
    }
    dispatch({ type: 'COMMIT_QUERY' });
  }, [draft, uiState.tracking, uiState.yamlMode, methods, dispatch]);

  const handleDraftChange = useCallback(
    (update: Partial<typeof draft>) => {
      setDraft((d) => ({ ...d, ...update }));
    },
    [setDraft]
  );

  const handleSubmit = methods.handleSubmit((values) => {
    if (isCreate) {
      onCreateRule(composeFormToCreateRequest(values));
    } else if (ruleId && onUpdateRule) {
      onUpdateRule(ruleId, composeFormToUpdateRequest(values));
    }
  });

  // YAML "Save" — flush any pending debounce into RHF, then run the shared
  // handleSubmit path so validation + submission use a single pipeline.
  const handleYamlSave = useCallback(() => {
    cancelYamlParse();
    const result = parseYamlToFormValues(yamlText);
    if (result.values) {
      methods.reset(formValuesFromYamlToCompose(result.values));
      // No syncForm() here: draft is temporarily stale after methods.reset(), but
      // we're about to submit. On success the flyout closes; on failure the user is still
      // in YAML mode and handleToggleYamlMode(false) will resync draft when they switch back.
    }
    handleSubmit();
  }, [cancelYamlParse, yamlText, methods, handleSubmit]);

  const handleNext = useCallback(async () => {
    if (currentStep?.validate) {
      const valid = await currentStep.validate(methods, uiState);
      if (!valid) return;
    }
    dispatch({ type: 'GO_NEXT' });
  }, [currentStep, methods, uiState, dispatch]);

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
              <EuiFlexItem grow>
                {uiState.yamlMode ? (
                  <EuiBadge color="hollow" data-test-subj="composeDiscoverYamlBadge">
                    {i18n.translate('xpack.alertingV2.composeDiscover.yamlMode.badge', {
                      defaultMessage: 'YAML MODE',
                    })}
                  </EuiBadge>
                ) : (
                  <HorizontalMinimalStepper
                    steps={steps.map(
                      (s, i): MinimalStep => ({
                        title: s.title,
                        status: getStepStatus(uiState.step, i),
                      })
                    )}
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend={i18n.translate('xpack.alertingV2.composeDiscover.editMode.legend', {
                    defaultMessage: 'Edit mode selection',
                  })}
                  options={EDIT_MODE_OPTIONS}
                  idSelected={uiState.yamlMode ? 'yaml' : 'form'}
                  onChange={(id) => handleToggleYamlMode(id === 'yaml')}
                  isIconOnly
                  buttonSize="compressed"
                  data-test-subj="composeDiscoverEditModeToggle"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            {uiState.yamlMode ? (
              <React.Suspense fallback={null}>
                <LazyYamlRuleForm
                  services={services}
                  yamlText={yamlText}
                  setYamlText={handleSetYamlText}
                  isSubmitting={isSaving}
                />
              </React.Suspense>
            ) : (
              <ComposeDiscoverForm
                state={uiState}
                dispatch={dispatch}
                services={services}
                onRecoveryTypeChange={handleRecoveryTypeChange}
              />
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
                    {isCreate ? 'Create rule' : 'Save rule'}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
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
                          Back
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      {isLastStep ? (
                        <EuiButton
                          fill
                          isLoading={isSaving}
                          onClick={handleSubmit}
                          data-test-subj="composeDiscoverSubmit"
                        >
                          {isCreate ? 'Create rule' : 'Save rule'}
                        </EuiButton>
                      ) : (
                        <EuiToolTip
                          content={
                            currentStep?.id === 'alertCondition' && !uiState.queryCommitted
                              ? 'Define a query in the editor before continuing'
                              : undefined
                          }
                        >
                          <EuiButton
                            fill
                            iconType="arrowRight"
                            iconSide="right"
                            isDisabled={
                              uiState.childOpen ||
                              (currentStep?.id === 'alertCondition' && !uiState.queryCommitted)
                            }
                            onClick={handleNext}
                            data-test-subj="composeDiscoverNext"
                          >
                            Next
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
              draft={draft}
              onDraftChange={handleDraftChange}
              tabConfig={getSandboxTabConfig(uiState)}
              activeTab={uiState.activeTab}
              onTabChange={(tab) => dispatch({ type: 'SET_TAB', tab })}
              onAlertEditorMount={onAlertEditorMount}
              onRecoveryEditorMount={onRecoveryEditorMount}
              onClose={() => dispatch({ type: 'CLOSE_CHILD' })}
              onApply={handleSandboxApply}
            />
          )}
        </EuiFlyout>
      </FormProvider>
    </RuleFormProvider>
  );
};
