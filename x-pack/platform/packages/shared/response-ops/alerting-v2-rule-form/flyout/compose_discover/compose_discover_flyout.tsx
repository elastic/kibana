/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { RULE_FORM_ID } from '../../form/constants';
import {
  mapRuleResponseToFormValues,
  mapFormValuesToCreateRequest,
  mapFormValuesToUpdateRequest,
} from '../../form/utils/rule_request_mappers';
import type { ComposeDiscoverMode } from './types';
import { useComposeDiscoverState, getStepTitles } from './use_compose_discover_state';
import { ComposeDiscoverForm } from './compose_discover_form';
import { ComposeDiscoverChild } from './compose_discover_child';
import { useEsqlAutocomplete } from './use_esql_providers';

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
  // ── UI state (step navigation, sandbox open/close, tab selection, etc.) ──
  // In edit mode, seed the sandbox draft with the rule's existing query so the
  // Alert Condition step shows the current query summary instead of "No query defined".
  const initialSandboxQuery =
    mode === 'edit'
      ? rule
        ? mapRuleResponseToFormValues(rule).evaluation?.query?.base ?? ''
        : ''
      : '';
  const [uiState, dispatch] = useComposeDiscoverState(mode, initialSandboxQuery);

  // Registered once here so providers persist across Sandbox open/close cycles.
  useEsqlAutocomplete(services);

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

  const stepTitles = getStepTitles();
  const isLastStep = uiState.step === stepTitles.length - 1;

  // ── YAML mode state ──────────────────────────────────────────────────────
  // Lifted to the parent so yamlText survives the YAML editor unmounting
  // when toggling back to Form mode.
  const [yamlText, setYamlText] = useState('');

  const handleToggleYamlMode = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        setYamlText(serializeFormToYaml(methods.getValues()));
      } else {
        // Lenient parse so partially-filled YAML (e.g. name set but no
        // query yet) still flushes back into form state.
        const result = parseYamlToFormValues(yamlText, { strict: false });
        if (result.values) {
          methods.reset(result.values);
        }
      }
      dispatch({ type: 'SET_YAML_MODE', enabled });
    },
    [methods, yamlText, dispatch]
  );

  // Form → YAML: regenerate YAML when form values change from external
  // sources (e.g. Sandbox "Apply changes"). Uses the callback variant of
  // watch() so the parent does not re-render on every form keystroke.
  useEffect(() => {
    if (!uiState.yamlMode) return;
    const { unsubscribe } = methods.watch(() => {
      setYamlText(serializeFormToYaml(methods.getValues()));
    });
    return unsubscribe;
  }, [uiState.yamlMode, methods]);

  // YAML submit handler — parses YAML and submits directly.
  const handleYamlSubmit = useCallback(
    (values: FormValues) => {
      if (isCreate) {
        onCreateRule(mapFormValuesToCreateRequest(values));
      } else if (ruleId && onUpdateRule) {
        onUpdateRule(ruleId, mapFormValuesToUpdateRequest(values));
      }
    },
    [isCreate, onCreateRule, ruleId, onUpdateRule]
  );

  // Sync the committed query into RHF whenever the user applies changes from the Sandbox.
  // timeField and grouping are written directly to RHF by the form components via useFormContext.
  useEffect(() => {
    if (uiState.queryCommitted && uiState.sandbox.query) {
      methods.setValue('evaluation', { query: { base: uiState.sandbox.query } });
    }
  }, [uiState.sandbox.query, uiState.queryCommitted, methods]);

  const handleSubmit = methods.handleSubmit((values) => {
    if (isCreate) {
      onCreateRule(mapFormValuesToCreateRequest(values));
    } else if (ruleId && onUpdateRule) {
      onUpdateRule(ruleId, mapFormValuesToUpdateRequest(values));
    }
  });

  const handleNext = useCallback(async () => {
    // Step 0: require a committed query before advancing
    if (uiState.step === 0 && !uiState.queryCommitted) return;
    // Step 1: validate that the rule name has been filled in
    if (uiState.step === 1) {
      const valid = await methods.trigger(['metadata.name']);
      if (!valid) return;
    }
    dispatch({ type: 'GO_NEXT' });
  }, [uiState.step, uiState.queryCommitted, methods, dispatch]);

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
                    YAML MODE
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
                  onSubmit={handleYamlSubmit}
                  yamlText={yamlText}
                  setYamlText={setYamlText}
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
                    onClick={() => handleToggleYamlMode(false)}
                    data-test-subj="composeDiscoverYamlCancel"
                  >
                    Cancel YAML
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    type="submit"
                    form={RULE_FORM_ID}
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
                            uiState.step === 0 && !uiState.queryCommitted
                              ? 'Define a query in the editor before continuing'
                              : undefined
                          }
                        >
                          <EuiButton
                            fill
                            iconType="arrowRight"
                            iconSide="right"
                            isDisabled={
                              uiState.childOpen || (uiState.step === 0 && !uiState.queryCommitted)
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
              onClose={() => dispatch({ type: 'CLOSE_CHILD' })}
            />
          )}
        </EuiFlyout>
      </FormProvider>
    </RuleFormProvider>
  );
};
