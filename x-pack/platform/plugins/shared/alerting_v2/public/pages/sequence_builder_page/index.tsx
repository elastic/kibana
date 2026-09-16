/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { useParams, useLocation } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import { RuleFormProvider } from '@kbn/alerting-v2-rule-form';
import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';
import { useAlertingLocators } from '../../application/locator_context';
import { useSequenceBuilderForm, useSequenceBuilderState } from './use_sequence_builder_form';
import { SequenceBuilderHeader } from './sequence_builder_header';
import { AlertConditionCanvas } from './alert_condition_canvas';
import {
  RecoveryConditionCanvas,
  DEFAULT_RECOVERY_CONFIG,
  resolveRecoveryIndices,
} from './recovery_condition_canvas';
import type { RecoveryConfig } from './recovery_condition_canvas';
import { SequenceBuilderDetailsSidebar } from './sequence_builder_details_sidebar';

const useRuleFormServicesBag = (): RuleFormServices => {
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const uiSettings = useService(CoreStart('uiSettings'));
  const featureFlags = useService(CoreStart('featureFlags'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;
  const lens = useService(PluginStart('lens')) as LensPublicStart;
  const uiActions = useService(PluginStart('uiActions')) as UiActionsStart;
  const dashboard = useService(PluginStart('dashboard'), { optional: true }) as
    | DashboardStart
    | undefined;
  const cps = useService(PluginStart('cps'), { optional: true }) as CPSPluginStart | undefined;

  return useMemo<RuleFormServices>(
    () => ({
      http,
      data,
      dataViews,
      notifications,
      application,
      uiSettings,
      featureFlags,
      lens,
      uiActions,
      dashboard,
      cps,
    }),
    [
      http,
      data,
      dataViews,
      notifications,
      application,
      uiSettings,
      featureFlags,
      lens,
      uiActions,
      dashboard,
      cps,
    ]
  );
};

export const SequenceBuilderPage: React.FC = () => {
  const { ruleId } = useParams<{ ruleId?: string }>();
  const location = useLocation();
  const cloneFromId = useMemo(
    () => new URLSearchParams(location.search).get('cloneFrom') ?? undefined,
    [location.search]
  );
  const sourceRuleId = ruleId ?? cloneFromId;
  const ruleFormServices = useRuleFormServicesBag();
  const { rulesLocators } = useAlertingLocators();

  const { methods, isLoading, parsedSeqValues, savedRecoveryStepIndices, savedStepsCount } =
    useSequenceBuilderForm(sourceRuleId, { isClone: Boolean(cloneFromId) });
  const uiState = useSequenceBuilderState(parsedSeqValues);
  const { setSeqValues: setCanvasSeqValues } = uiState;

  const hasMissingRules = useMemo(
    () => uiState.seqValues.steps.some((step) => step.rules.some((r) => r.isMissing)),
    [uiState.seqValues.steps]
  );

  const [recoveryConfig, setRecoveryConfig] = useState<RecoveryConfig>(DEFAULT_RECOVERY_CONFIG);

  const hasSyncedRecoveryConfigRef = useRef(false);
  useEffect(() => {
    if (
      savedRecoveryStepIndices === undefined ||
      savedStepsCount === undefined ||
      hasSyncedRecoveryConfigRef.current
    )
      return;
    hasSyncedRecoveryConfigRef.current = true;

    if (savedRecoveryStepIndices.length >= 1) {
      const isAll = savedRecoveryStepIndices.length === savedStepsCount;
      const isLast =
        savedRecoveryStepIndices.length === 1 &&
        savedRecoveryStepIndices[0] === savedStepsCount - 1;

      if (isAll) {
        setRecoveryConfig({ mode: 'all' });
      } else if (!isLast) {
        setRecoveryConfig({ mode: 'custom' });
        setCanvasSeqValues((prev) => ({
          ...prev,
          recoveryStepIndices: savedRecoveryStepIndices,
        }));
      }
    }
  }, [savedRecoveryStepIndices, savedStepsCount, setCanvasSeqValues]);

  const [isRuleListOpen, setIsRuleListOpen] = useState(true);
  const handleToggleRuleList = useCallback(() => setIsRuleListOpen((v) => !v), []);

  const handleStepChange = useCallback(
    (nextStep: 'alert' | 'recovery') => {
      if (nextStep === 'recovery') {
        uiState.setSeqValues((prev) => ({
          ...prev,
          ...resolveRecoveryIndices(
            recoveryConfig.mode,
            prev.steps.length,
            prev.recoveryStepIndices
          ),
        }));
      }
      uiState.setStep(nextStep);
      uiState.setSidebarOpen(false);
    },
    [uiState, recoveryConfig.mode]
  );

  const handleCancel = useCallback(() => {
    rulesLocators.navigateSync({});
  }, [rulesLocators]);

  const rulesListHref = rulesLocators.useUrl({});

  const handleSave = methods.handleSubmit((formValues) => uiState.save(formValues, ruleId));

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: '100%' }}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexGroup>
    );
  }

  const canvasContent =
    uiState.step === 'alert' ? (
      <AlertConditionCanvas
        seqValues={uiState.seqValues}
        setSeqValues={uiState.setSeqValues}
        isRuleListOpen={isRuleListOpen}
        onToggleRuleList={handleToggleRuleList}
        excludeRuleId={sourceRuleId}
      />
    ) : (
      <RecoveryConditionCanvas
        seqValues={uiState.seqValues}
        setSeqValues={uiState.setSeqValues}
        recoveryConfig={recoveryConfig}
        setRecoveryConfig={setRecoveryConfig}
        isRuleListOpen={isRuleListOpen}
        onToggleRuleList={handleToggleRuleList}
      />
    );

  return (
    <RuleFormProvider services={ruleFormServices} meta={{ layout: 'flyout' }}>
      <FormProvider {...methods}>
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
          style={{ height: '100%', overflow: 'hidden' }}
        >
          <EuiFlexItem grow={false}>
            <SequenceBuilderHeader
              step={uiState.step}
              sidebarOpen={uiState.sidebarOpen}
              seqValues={uiState.seqValues}
              isSaving={uiState.isSaving}
              ruleFetchError={hasMissingRules}
              rulesListHref={rulesListHref}
              onStepChange={handleStepChange}
              onToggleDetails={() => uiState.setSidebarOpen((open) => !open)}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </EuiFlexItem>

          <EuiFlexItem style={{ minHeight: 0 }}>
            <SequenceBuilderDetailsSidebar
              canvas={canvasContent}
              sidebarOpen={uiState.sidebarOpen}
              ruleId={ruleId}
              seqValues={uiState.seqValues}
              isSaving={uiState.isSaving}
              ruleFetchError={hasMissingRules}
              onCloseSidebar={() => uiState.setSidebarOpen(false)}
              onSave={handleSave}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </FormProvider>
    </RuleFormProvider>
  );
};
