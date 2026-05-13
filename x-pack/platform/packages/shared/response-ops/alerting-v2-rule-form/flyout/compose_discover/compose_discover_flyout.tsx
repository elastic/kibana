/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { RuleFormProvider } from '../../form/contexts/rule_form_context';
import type { FormValues } from '../../form/types';
import {
  mapRuleResponseToFormValues,
  mapFormValuesToCreateRequest,
  mapFormValuesToUpdateRequest,
} from '../../form/utils/rule_request_mappers';
import type { ComposeDiscoverMode } from './types';
import { useComposeDiscoverState, getSandboxTabConfig } from './use_compose_discover_state';
import { ComposeDiscoverForm, getSteps } from './compose_discover_form';
import { ComposeDiscoverChild } from './compose_discover_child';
import { useEsqlAutocomplete } from './use_esql_providers';
import { useSplitQueryCompletion } from './use_split_query_completion';

/*
 * These hooks live in the plugin, not the package — imported via the plugin's hook layer
 * when this flyout is rendered in the rules list page.
 * For now they are passed as props to keep the package boundary clean.
 */
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
   */
  const initialSandboxQuery =
    mode === 'edit'
      ? rule
        ? mapRuleResponseToFormValues(rule).evaluation?.query?.base ?? ''
        : ''
      : '';
  const [uiState, dispatch] = useComposeDiscoverState(mode, initialSandboxQuery);

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
   * Sync the committed query into RHF whenever the user applies changes from the Sandbox.
   * When tracking is disabled: sync fullQuery → evaluation.query.base.
   * When tracking is enabled:  sync baseQuery → evaluation.query.base (the base portion is
   *   what the rule executor runs; the alert block is stored separately).
   * timeField and grouping are written directly to RHF by the form components via useFormContext.
   */
  useEffect(() => {
    if (!uiState.queryCommitted) return;
    const queryBase = uiState.tracking ? uiState.baseQuery : uiState.fullQuery;
    if (queryBase) {
      methods.setValue('evaluation', { query: { base: queryBase } });
    }
  }, [uiState.fullQuery, uiState.baseQuery, uiState.tracking, uiState.queryCommitted, methods]);

  const handleSubmit = methods.handleSubmit((values) => {
    if (isCreate) {
      onCreateRule(mapFormValuesToCreateRequest(values));
    } else if (ruleId && onUpdateRule) {
      onUpdateRule(ruleId, mapFormValuesToUpdateRequest(values));
    }
  });

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

            {/* Step indicator coming in PR A — HorizontalMinimalStepper */}
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <ComposeDiscoverForm state={uiState} dispatch={dispatch} services={services} />
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
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
          </EuiFlyoutFooter>

          {uiState.childOpen && (
            <ComposeDiscoverChild
              state={uiState}
              dispatch={dispatch}
              tabConfig={getSandboxTabConfig(uiState)}
              onAlertEditorMount={onAlertEditorMount}
              onRecoveryEditorMount={onRecoveryEditorMount}
              onClose={() => dispatch({ type: 'CLOSE_CHILD' })}
            />
          )}
        </EuiFlyout>
      </FormProvider>
    </RuleFormProvider>
  );
};
