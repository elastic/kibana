/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
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
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { RuleFormProvider } from '../../form/contexts/rule_form_context';
import type { FormValues } from '../../form/types';
import { serializeFormToYaml, parseYamlToFormValues } from '../../form/utils/yaml_form_utils';
import {
  mapRuleResponseToFormValues,
  mapFormValuesToCreateRequest,
  mapFormValuesToUpdateRequest,
} from '../../form/utils/rule_request_mappers';
import type { ComposeDiscoverMode, SandboxApplyData } from './types';
import { useComposeDiscoverState, getSandboxTabConfig } from './use_compose_discover_state';
import { ComposeDiscoverForm, getSteps } from './compose_discover_form';
import { ComposeDiscoverChild } from './compose_discover_child';
import { useEsqlAutocomplete } from './use_esql_providers';
import { useSplitQueryCompletion } from './use_split_query_completion';

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
  rule?: Parameters<typeof mapRuleResponseToFormValues>[0];
  /** The ID of the rule being edited. Required when mode === 'edit'. */
  ruleId?: string;
  onClose: () => void;
  services: RuleFormServices;
  /** Called with the create payload when the user submits in create mode. */
  onCreateRule: (payload: ReturnType<typeof mapFormValuesToCreateRequest>) => void;
  /** Called with id + update payload when the user submits in edit mode. */
  onUpdateRule?: (id: string, payload: ReturnType<typeof mapFormValuesToUpdateRequest>) => void;
  /** True while a create/update mutation is in flight. */
  isSaving?: boolean;
}

const FLYOUT_TITLE_ID = 'composeDiscoverFlyoutTitle';

const EMPTY_FORM_VALUES: FormValues = {
  kind: 'alert',
  metadata: { name: '', enabled: true, description: '', tags: [] },
  timeField: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  evaluation: { query: { base: '' } },
  grouping: undefined,
  recoveryPolicy: { type: 'no_breach' },
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
  const initialMapped = mode === 'edit' && rule ? mapRuleResponseToFormValues(rule) : undefined;
  const [uiState, dispatch] = useComposeDiscoverState({
    mode,
    initialQuery: initialMapped?.evaluation?.query?.base ?? '',
    initialRecoveryQuery:
      initialMapped?.recoveryPolicy?.type === 'query'
        ? initialMapped.recoveryPolicy.query?.base ?? undefined
        : undefined,
  });

  // Registered once here so providers persist across Sandbox open/close cycles.
  useEsqlAutocomplete(services);

  /*
   * Split-query completion for alert and recovery block editors. Registered at
   * the flyout level so providers survive Sandbox (child) open/close cycles and
   * are immune to React Strict Mode double-mount disposal.
   */
  const { onEditorMount: onAlertEditorMount } = useSplitQueryCompletion({
    baseQuery: uiState.baseQuery,
    search: services.data.search.search,
  });
  const { onEditorMount: onRecoveryEditorMount } = useSplitQueryCompletion({
    baseQuery: uiState.baseQuery,
    search: services.data.search.search,
  });

  // ── Form values (submitted to the API) ──
  const defaultValues = useMemo<FormValues>(() => {
    if (rule) {
      const mapped = mapRuleResponseToFormValues(rule);
      return {
        kind: mapped.kind ?? 'alert',
        metadata: {
          name: mapped.metadata?.name ?? '',
          enabled: mapped.metadata?.enabled ?? true,
          description: mapped.metadata?.description ?? '',
          owner: mapped.metadata?.owner,
          tags: mapped.metadata?.tags ?? [],
        },
        timeField: mapped.timeField ?? '@timestamp',
        schedule: {
          every: mapped.schedule?.every ?? '1m',
          lookback: mapped.schedule?.lookback ?? '5m',
        },
        evaluation: { query: { base: mapped.evaluation?.query?.base ?? '' } },
        grouping: mapped.grouping,
        recoveryPolicy: mapped.recoveryPolicy ?? { type: 'no_breach' },
        stateTransition: mapped.stateTransition,
        stateTransitionAlertDelayMode: mapped.stateTransitionAlertDelayMode ?? 'immediate',
        stateTransitionRecoveryDelayMode: mapped.stateTransitionRecoveryDelayMode ?? 'immediate',
        artifacts: mapped.artifacts ?? [],
      };
    }
    return EMPTY_FORM_VALUES;
  }, [rule]);

  const methods = useForm<FormValues>({ mode: 'onBlur', defaultValues });

  const isCreate = mode === 'create';
  const title = isCreate ? 'Create alert rule' : 'Edit alert rule';

  const steps = getSteps(uiState.tracking);
  const currentStep = steps[uiState.step];
  const isLastStep = uiState.step === steps.length - 1;

  /*
   * Sync recovery policy into RHF.
   * When tracking + custom recovery: assemble base + recoveryBlock into a full
   * query and store it under recoveryPolicy.query.base (type 'query').
   * Otherwise: reset to the default no_breach policy.
   *
   * This effect covers recovery type changes (e.g. user switches from
   * "Default" to "Custom" in the step form) which happen outside the
   * Sandbox Apply flow.
   */
  useEffect(() => {
    if (!uiState.queryCommitted) return;
    if (uiState.tracking && uiState.recoveryType === 'custom') {
      const recoveryQuery = [uiState.baseQuery, uiState.recoveryBlock].filter(Boolean).join('\n');
      methods.setValue('recoveryPolicy', {
        type: 'query',
        query: { base: recoveryQuery },
      });
    } else {
      methods.setValue('recoveryPolicy', { type: 'no_breach' });
    }
  }, [
    uiState.tracking,
    uiState.recoveryType,
    uiState.baseQuery,
    uiState.recoveryBlock,
    uiState.queryCommitted,
    methods,
  ]);

  // ── YAML mode state ──────────────────────────────────────────────────────
  const [yamlText, setYamlText] = useState('');
  const preYamlFormSnapshotRef = useRef<FormValues | null>(null);
  const debouncedParseRef = useRef<ReturnType<typeof setTimeout>>();

  // Wraps setYamlText with a debounced (~300 ms) lenient parse that pushes
  // every YAML keystroke into RHF. The Sandbox watches RHF, so it sees
  // YAML edits live. Passed to YamlRuleForm as the setYamlText prop.
  const handleSetYamlText = useCallback(
    (yaml: string) => {
      setYamlText(yaml);
      clearTimeout(debouncedParseRef.current);
      debouncedParseRef.current = setTimeout(() => {
        const result = parseYamlToFormValues(yaml);
        if (result.values) {
          methods.reset(result.values);
        }
      }, 300);
    },
    [methods]
  );

  const handleToggleYamlMode = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        preYamlFormSnapshotRef.current = methods.getValues();
        setYamlText(serializeFormToYaml(methods.getValues()));
      } else {
        clearTimeout(debouncedParseRef.current);
        const result = parseYamlToFormValues(yamlText);
        if (result.values) {
          methods.reset(result.values);
          const parsedQuery = result.values.evaluation?.query?.base ?? '';
          dispatch({ type: 'COMMIT_CHILD_QUERY', fullQuery: parsedQuery });
        }
        preYamlFormSnapshotRef.current = null;
      }
      dispatch({ type: 'SET_YAML_MODE', enabled });
    },
    [methods, yamlText, dispatch]
  );

  const handleCancelYaml = useCallback(() => {
    clearTimeout(debouncedParseRef.current);
    if (preYamlFormSnapshotRef.current) {
      methods.reset(preYamlFormSnapshotRef.current);
      preYamlFormSnapshotRef.current = null;
    }
    dispatch({ type: 'SET_YAML_MODE', enabled: false });
  }, [methods, dispatch]);

  // Imperative handler for Sandbox "Apply changes". Writes the committed
  // query into both RHF (the source of truth) and the reducer cache, then
  // regenerates YAML if in YAML mode. No effects involved for the eval
  // query — every Apply call executes this directly.
  const handleSandboxApply = useCallback(
    (data: SandboxApplyData) => {
      const evalBase = data.isSplit
        ? [data.baseQuery, data.alertBlock].filter(Boolean).join('\n')
        : data.fullQuery;
      methods.setValue('evaluation.query.base', evalBase);

      if (data.isSplit) {
        dispatch({
          type: 'COMMIT_CHILD_SPLIT',
          baseQuery: data.baseQuery,
          alertBlock: data.alertBlock,
          recoveryBlock: data.recoveryBlock,
        });
      } else {
        dispatch({ type: 'COMMIT_CHILD_QUERY', fullQuery: data.fullQuery });
      }

      if (uiState.yamlMode) {
        setYamlText(serializeFormToYaml(methods.getValues()));
      }
    },
    [dispatch, methods, uiState.yamlMode]
  );

  const handleSubmit = methods.handleSubmit((values) => {
    if (isCreate) {
      onCreateRule(mapFormValuesToCreateRequest(values));
    } else if (ruleId && onUpdateRule) {
      onUpdateRule(ruleId, mapFormValuesToUpdateRequest(values));
    }
  });

  // YAML "Save" — flush any pending debounce into RHF, then run the shared
  // handleSubmit path so validation + submission use a single pipeline.
  const handleYamlSave = useCallback(() => {
    clearTimeout(debouncedParseRef.current);
    const result = parseYamlToFormValues(yamlText);
    if (result.values) {
      methods.reset(result.values);
    }
    handleSubmit();
  }, [yamlText, methods, handleSubmit]);

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
              <EuiFlexItem grow={false}>
                {uiState.yamlMode ? (
                  <EuiBadge color="hollow" data-test-subj="composeDiscoverYamlBadge">
                    {i18n.translate('xpack.alertingV2.composeDiscover.yamlMode.badge', {
                      defaultMessage: 'YAML MODE',
                    })}
                  </EuiBadge>
                ) : (
                  <>{/* Step indicator coming in PR A — HorizontalMinimalStepper */}</>
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
              <ComposeDiscoverForm state={uiState} dispatch={dispatch} services={services} />
            )}
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            {uiState.yamlMode ? (
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={handleCancelYaml}
                    data-test-subj="composeDiscoverYamlCancel"
                  >
                    {i18n.translate('xpack.alertingV2.composeDiscover.yamlMode.cancelButton', {
                      defaultMessage: 'Cancel YAML',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
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
            <ComposeDiscoverChild
              state={uiState}
              dispatch={dispatch}
              tabConfig={getSandboxTabConfig(uiState)}
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
