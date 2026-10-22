/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { FormProvider } from 'react-hook-form';
import { useParams, useLocation } from 'react-router-dom';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import { RuleFormProvider } from '@kbn/alerting-v2-rule-form';
import type { FormValues, RuleFormServices, SequenceFormValues } from '@kbn/alerting-v2-rule-form';
import type { UseFormReturn } from 'react-hook-form';
import { getMinimumScheduleInterval } from '../../kibana_services';
import { useAlertingLocators } from '../../application/locator_context';
import { CreateActionPolicyFormFlyout } from '../../components/action_policy/form_flyout/create_action_policy_form_flyout';
import { useCreateActionPolicyDisabledReason } from '../../hooks/use_create_action_policy_disabled_reason';
import { useSequenceBuilderForm, useSequenceBuilderState } from './use_sequence_builder_form';
import type { SequenceBuilderLoadError } from './use_sequence_builder_form';
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
  const createActionPolicyDisabledReason = useCreateActionPolicyDisabledReason();
  const { actionPolicyLocators } = useAlertingLocators();
  const getActionPolicyEditHref = useCallback(
    (actionPolicyId: string) =>
      actionPolicyLocators.getRedirectUrl({ page: 'edit', actionPolicyId }),
    [actionPolicyLocators]
  );

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
      minimumScheduleInterval: getMinimumScheduleInterval(),
      createActionPolicyFormFlyout: CreateActionPolicyFormFlyout,
      createActionPolicyDisabledReason,
      getActionPolicyEditHref,
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
      createActionPolicyDisabledReason,
      getActionPolicyEditHref,
    ]
  );
};

const resolveSavedRecoveryConfig = (
  savedRecoveryStepIndices: number[] | undefined,
  savedStepsCount: number | undefined
): RecoveryConfig => {
  if (!savedRecoveryStepIndices?.length || savedStepsCount === undefined) {
    return DEFAULT_RECOVERY_CONFIG;
  }
  if (savedRecoveryStepIndices.length === savedStepsCount) return { mode: 'all' };
  const isLast =
    savedRecoveryStepIndices.length === 1 && savedRecoveryStepIndices[0] === savedStepsCount - 1;
  return isLast ? DEFAULT_RECOVERY_CONFIG : { mode: 'custom' };
};

interface SequenceBuilderProps {
  ruleId: string | undefined;
  sourceRuleId: string | undefined;
  methods: UseFormReturn<FormValues>;
  initialSeqValues: SequenceFormValues | undefined;
  initialRecoveryConfig: RecoveryConfig;
}

const SequenceBuilder: React.FC<SequenceBuilderProps> = ({
  ruleId,
  sourceRuleId,
  methods,
  initialSeqValues,
  initialRecoveryConfig,
}) => {
  const { euiTheme } = useEuiTheme();
  const { rulesLocators } = useAlertingLocators();
  const uiState = useSequenceBuilderState(initialSeqValues);

  const hasMissingRules = useMemo(
    () => uiState.seqValues.steps.some((step) => step.rules.some((r) => r.isMissing)),
    [uiState.seqValues.steps]
  );

  const [recoveryConfig, setRecoveryConfig] = useState<RecoveryConfig>(initialRecoveryConfig);

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
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      css={css`
        /* EuiPageSection padding is size.l on each side; percentage height cannot fill it. */
        block-size: calc(var(--kbn-application--content-height, 100vh) - ${euiTheme.size.l} * 2);
        overflow: hidden;
      `}
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

      <EuiFlexItem
        css={css`
          min-block-size: 0;
          display: flex;
          flex-direction: column;
        `}
      >
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
  );
};

const SequenceBuilderLoadFailure: React.FC<{
  reason: SequenceBuilderLoadError;
  rulesListHref: string;
}> = ({ reason, rulesListHref }) => (
  <EuiEmptyPrompt
    color="danger"
    iconType="error"
    data-test-subj="sequenceBuilderLoadError"
    title={
      <h2>
        <FormattedMessage
          id="xpack.alertingV2.sequenceBuilderPage.loadError.title"
          defaultMessage="Unable to open this rule"
        />
      </h2>
    }
    body={
      <p>
        {reason === 'fetch' ? (
          <FormattedMessage
            id="xpack.alertingV2.sequenceBuilderPage.loadError.fetchBody"
            defaultMessage="The rule could not be loaded. It may have been deleted, or you may not have access to it."
          />
        ) : (
          <FormattedMessage
            id="xpack.alertingV2.sequenceBuilderPage.loadError.parseBody"
            defaultMessage="This rule's query cannot be opened in the sequence builder. Edit it in the ES|QL editor instead."
          />
        )}
      </p>
    }
    actions={
      <EuiButton
        href={rulesListHref}
        color="primary"
        fill
        data-test-subj="sequenceBuilderLoadErrorBack"
      >
        <FormattedMessage
          id="xpack.alertingV2.sequenceBuilderPage.loadError.backToRules"
          defaultMessage="Back to rules"
        />
      </EuiButton>
    }
  />
);

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
  const rulesListHref = rulesLocators.useUrl({});

  const {
    methods,
    isLoading,
    loadError,
    parsedSeqValues,
    savedRecoveryStepIndices,
    savedStepsCount,
  } = useSequenceBuilderForm(sourceRuleId, { isClone: Boolean(cloneFromId) });

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: '100%' }}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexGroup>
    );
  }

  if (loadError) {
    return <SequenceBuilderLoadFailure reason={loadError} rulesListHref={rulesListHref} />;
  }

  return (
    <RuleFormProvider services={ruleFormServices} meta={{ layout: 'flyout' }}>
      <FormProvider {...methods}>
        <SequenceBuilder
          ruleId={ruleId}
          sourceRuleId={sourceRuleId}
          methods={methods}
          initialSeqValues={parsedSeqValues}
          initialRecoveryConfig={resolveSavedRecoveryConfig(
            savedRecoveryStepIndices,
            savedStepsCount
          )}
        />
      </FormProvider>
    </RuleFormProvider>
  );
};
