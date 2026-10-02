/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BuilderState,
  ComposeDiscoverMode,
  RuleFormServices,
} from '@kbn/alerting-v2-rule-form';
import { ESQLMenu, EsqlEditorActionsProvider, EsqlEditorActionsRegister } from '@kbn/esql/public';
import { ComposeDiscoverFlyout, RULE_BUILDER_REGISTRY } from '@kbn/alerting-v2-rule-form';
import type { RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import React, { useCallback, useMemo, useState } from 'react';
import type { RuleApiResponse } from '../services/rules_api';
import { CreateActionPolicyFormFlyout } from '../components/action_policy/form_flyout/create_action_policy_form_flyout';
import { useBuilderToEsqlTransition } from './use_builder_to_esql_transition';
import { useCreateActionPolicyDisabledReason } from './use_create_action_policy_disabled_reason';
import { useCreateRule } from './use_create_rule';
import { useUpdateRule } from './use_update_rule';

const templateToSyntheticRule = (template: RuleTemplateResponse): RuleApiResponse => ({
  ...template.rule,
  // `null` is the write-side way to say "no delays"; a rule read back never carries it.
  state_transition: template.rule.state_transition ?? undefined,
  id: '',
  version: 1,
  enabled: false,
  created_by: null,
  created_at: new Date().toISOString(),
  updated_by: null,
  updated_at: new Date().toISOString(),
});

interface UseComposeDiscoverFlyoutOptions {
  createSuccessRedirectPath?: string;
  /**
   * Shared EUI flyout history key. When provided (rules-list create session), the
   * authoring flyout joins the option picker's history so Back returns to the picker.
   */
  historyKey?: symbol;
  /**
   * Closes a stacked option picker when the authoring flyout is dismissed or a
   * rule is created. Back does not call this — the picker stays mounted.
   */
  onDismiss?: () => void;
}

export const useComposeDiscoverFlyout = ({
  createSuccessRedirectPath,
  historyKey: sharedHistoryKey,
  onDismiss,
}: UseComposeDiscoverFlyoutOptions = {}) => {
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const uiSettings = useService(CoreStart('uiSettings'));
  const featureFlags = useService(CoreStart('featureFlags'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;
  const lens = useService(PluginStart('lens')) as LensPublicStart;
  const uiActions = useService(PluginStart('uiActions')) as UiActionsStart;
  // `dashboard` is an optional plugin dependency; resolve it leniently so the
  // flyout still mounts in environments where the dashboard plugin is disabled.
  const dashboard = useService(PluginStart('dashboard'), { optional: true }) as
    | DashboardStart
    | undefined;
  const cps = useService(PluginStart('cps'), { optional: true }) as CPSPluginStart | undefined;
  const createActionPolicyDisabledReason = useCreateActionPolicyDisabledReason();

  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutMode, setFlyoutMode] = useState<ComposeDiscoverMode>('create');
  const [targetRule, setTargetRule] = useState<RuleApiResponse | null>(null);
  const [builderType, setBuilderType] = useState<string | null>(null);
  const [initialBuilderState, setInitialBuilderState] = useState<BuilderState>(undefined);
  const [flyoutGeneration, setFlyoutGeneration] = useState(0);
  const [closeGeneration, setCloseGeneration] = useState(0);
  const generatedHistoryKey = useMemo(() => Symbol('ruleAuthoring'), []);
  /*
   * All create-mode flyouts join the picker session when a shared key is provided,
   * including template-seeded creates that carry a synthetic `targetRule`.
   * Edit/clone keep a private key so they do not stack on the picker.
   */
  const historyKey =
    flyoutMode === 'create' && sharedHistoryKey !== undefined
      ? sharedHistoryKey
      : generatedHistoryKey;

  const showFlyout = useCallback(() => {
    setFlyoutGeneration((generation) => generation + 1);
    setFlyoutOpen(true);
  }, []);

  const hideFlyout = useCallback(() => {
    setFlyoutOpen(false);
    setTargetRule(null);
    setBuilderType(null);
    setInitialBuilderState(undefined);
    setCloseGeneration(0);
  }, []);

  const requestClose = useCallback(() => {
    setCloseGeneration((generation) => generation + 1);
  }, []);

  const dismissFlyout = useCallback(() => {
    hideFlyout();
    onDismiss?.();
  }, [hideFlyout, onDismiss]);

  const closeAndRedirect = useCallback(() => {
    dismissFlyout();
    if (createSuccessRedirectPath) {
      application.navigateToUrl(http.basePath.prepend(createSuccessRedirectPath));
    }
  }, [application, createSuccessRedirectPath, dismissFlyout, http]);

  const openInEsql = useCallback(
    (rule: RuleApiResponse, mode: ComposeDiscoverMode) => {
      setTargetRule(rule);
      setFlyoutMode(mode);
      setBuilderType(null);
      setInitialBuilderState(undefined);
      showFlyout();
    },
    [showFlyout]
  );

  const handleConfirmSwitch = useCallback(() => {
    setBuilderType(null);
    setInitialBuilderState(undefined);
  }, []);

  const { resolveBuilderMode, requestEsqlFallback, requestSwitchToEsql, confirmationModal } =
    useBuilderToEsqlTransition({
      onConfirmEsqlFallback: openInEsql,
      onConfirmSwitch: handleConfirmSwitch,
    });

  const createRuleMutation = useCreateRule();
  const updateRuleMutation = useUpdateRule();
  const ruleFormServices = useMemo<RuleFormServices>(
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
      esqlMenu: ESQLMenu,
      esqlEditorActionsProvider: EsqlEditorActionsProvider,
      esqlEditorActionsRegister: EsqlEditorActionsRegister,
      createActionPolicyFormFlyout: CreateActionPolicyFormFlyout,
      createActionPolicyDisabledReason,
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
    ]
  );

  const openCreateFlyout = useCallback(() => {
    setTargetRule(null);
    setFlyoutMode('create');
    setBuilderType(null);
    showFlyout();
  }, [showFlyout]);

  const openCreateBuilderFlyout = useCallback(
    (type: string) => {
      if (!RULE_BUILDER_REGISTRY[type]) {
        notifications.toasts.addWarning({
          title: i18n.translate('xpack.alertingV2.useComposeDiscoverFlyout.unknownBuilderTitle', {
            defaultMessage: 'Unknown rule builder type',
          }),
          text: i18n.translate('xpack.alertingV2.useComposeDiscoverFlyout.unknownBuilderText', {
            defaultMessage: 'No builder registered for type "{type}". Opening ES|QL mode instead.',
            values: { type },
          }),
        });
        openCreateFlyout();
        return;
      }
      setTargetRule(null);
      setFlyoutMode('create');
      setBuilderType(type);
      setInitialBuilderState(undefined);
      showFlyout();
    },
    [notifications.toasts, openCreateFlyout, showFlyout]
  );

  const openRuleFlyout = useCallback(
    (rule: RuleApiResponse, mode: ComposeDiscoverMode) => {
      const result = resolveBuilderMode(rule);
      if (result === 'esql') {
        openInEsql(rule, mode);
      } else if (result === 'esql-fallback') {
        requestEsqlFallback(rule, mode);
      } else {
        setTargetRule(rule);
        setFlyoutMode(mode);
        setBuilderType(result.builderType);
        setInitialBuilderState(result.initialBuilderState);
        showFlyout();
      }
    },
    [resolveBuilderMode, openInEsql, requestEsqlFallback, showFlyout]
  );

  const openEditFlyout = useCallback(
    (rule: RuleApiResponse) => openRuleFlyout(rule, 'edit'),
    [openRuleFlyout]
  );

  const openCloneFlyout = useCallback(
    (rule: RuleApiResponse) => openRuleFlyout(rule, 'clone'),
    [openRuleFlyout]
  );

  const openCreateFromTemplateFlyout = useCallback(
    (template: RuleTemplateResponse) => {
      const syntheticRule = templateToSyntheticRule(template);
      const result = resolveBuilderMode(syntheticRule);
      if (result !== 'esql' && result !== 'esql-fallback') {
        setTargetRule(syntheticRule);
        setFlyoutMode('create');
        setBuilderType(result.builderType);
        setInitialBuilderState(result.initialBuilderState);
        showFlyout();
      } else {
        openInEsql(syntheticRule, 'create');
      }
    },
    [resolveBuilderMode, openInEsql, showFlyout]
  );

  const flyout = flyoutOpen ? (
    <ComposeDiscoverFlyout
      key={flyoutGeneration}
      historyKey={historyKey}
      mode={flyoutMode}
      rule={targetRule ?? undefined}
      ruleId={flyoutMode === 'edit' ? targetRule?.id : undefined}
      onClose={dismissFlyout}
      onHistoryBack={hideFlyout}
      closeGeneration={closeGeneration}
      services={ruleFormServices}
      builderType={builderType ?? undefined}
      initialBuilderState={initialBuilderState}
      onSwitchToEsql={builderType ? requestSwitchToEsql : undefined}
      onCreateRule={(payload) =>
        createRuleMutation.mutate({ payload }, { onSuccess: closeAndRedirect })
      }
      onUpdateRule={(id, payload) =>
        updateRuleMutation.mutate({ id, payload }, { onSuccess: () => hideFlyout() })
      }
      isSaving={createRuleMutation.isLoading || updateRuleMutation.isLoading}
    />
  ) : null;

  return {
    flyout,
    confirmationModal,
    openCreateFlyout,
    openCreateBuilderFlyout,
    openCreateFromTemplateFlyout,
    openEditFlyout,
    openCloneFlyout,
    isOpen: flyoutOpen,
    requestClose,
  };
};
