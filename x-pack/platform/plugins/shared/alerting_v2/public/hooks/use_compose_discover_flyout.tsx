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
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { getMinimumScheduleInterval } from '../kibana_services';
import type { RuleApiResponse } from '../services/rules_api';
import { useAlertingLocators } from '../application/locator_context';
import { CreateActionPolicyFormFlyout } from '../components/action_policy/form_flyout/create_action_policy_form_flyout';
import { useBuilderToEsqlTransition } from './use_builder_to_esql_transition';
import { useCreateActionPolicyDisabledReason } from './use_create_action_policy_disabled_reason';
import { useCreateRule } from './use_create_rule';
import { useUpdateRule } from './use_update_rule';

/**
 * A template whose rule carries builder fields has no query of its own — the
 * server generates it on save — so seed an empty one to open the editor the
 * form would otherwise refuse to show.
 */
const EMPTY_QUERY: RuleApiResponse['query'] = { base: '' };

const templateToSyntheticRule = (template: RuleTemplateResponse): RuleApiResponse => ({
  ...template.rule,
  // `null` is the write-side way to say "no delays"; a rule read back never carries it.
  state_transition: template.rule.state_transition ?? undefined,
  query: template.rule.query ?? EMPTY_QUERY,
  id: '',
  version: 1,
  enabled: false,
  created_by: null,
  created_at: new Date().toISOString(),
  updated_by: null,
  updated_at: new Date().toISOString(),
  metadata: {
    ...template.rule.metadata,
    // signature_id is optional on proposed/attachment rules; '' is a safe fallback for
    // this synthetic draft that never gets serialised back to the server directly.
    signature_id: template.rule.metadata.signature_id ?? '',
  },
});

type FlyoutSource =
  | { kind: 'new' }
  | { kind: 'rule'; rule: RuleApiResponse }
  | { kind: 'template'; template: RuleTemplateResponse; rule: RuleApiResponse };

const NEW_SOURCE: FlyoutSource = { kind: 'new' };

interface UseComposeDiscoverFlyoutOptions {
  createSuccessRedirectPath?: string;
  /**
   * Shared EUI flyout history key. Pass it only while the option picker is open.
   * Create-mode flyouts opened without a picker (header ES|QL, empty state, templates)
   * get a fresh key so they do not join a later picker session.
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
  const { actionPolicyLocators } = useAlertingLocators();
  const getActionPolicyEditHref = useCallback(
    (actionPolicyId: string) =>
      actionPolicyLocators.getRedirectUrl({ page: 'edit', actionPolicyId }),
    [actionPolicyLocators]
  );

  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutMode, setFlyoutMode] = useState<ComposeDiscoverMode>('create');
  // What the flyout authors from; replacing it on open means no stale rule/template can leak over.
  const [source, setSource] = useState<FlyoutSource>(NEW_SOURCE);
  const [builderType, setBuilderType] = useState<string | null>(null);
  const [initialBuilderState, setInitialBuilderState] = useState<BuilderState>(undefined);
  const [flyoutGeneration, setFlyoutGeneration] = useState(0);
  const [sessionHistoryKey, setSessionHistoryKey] = useState<symbol>(() => Symbol('ruleAuthoring'));
  const [stackedOnPicker, setStackedOnPicker] = useState(false);
  const sharedHistoryKeyRef = useRef(sharedHistoryKey);
  sharedHistoryKeyRef.current = sharedHistoryKey;
  const closeRequestRef = useRef<(() => void) | null>(null);

  const targetRule = source.kind === 'new' ? null : source.rule;
  // Saving installs from the template while the flyout authors a rule from one.
  const templateId = source.kind === 'template' ? source.template.id : undefined;

  const openSession = useCallback((mode: ComposeDiscoverMode) => {
    const shared = sharedHistoryKeyRef.current;
    const stacked = mode === 'create' && shared !== undefined;
    setSessionHistoryKey(stacked ? shared : Symbol('ruleAuthoring'));
    setStackedOnPicker(stacked);
    setFlyoutGeneration((generation) => generation + 1);
    setFlyoutOpen(true);
  }, []);

  const hideFlyout = useCallback(() => {
    setFlyoutOpen(false);
    setSource(NEW_SOURCE);
    setBuilderType(null);
    setInitialBuilderState(undefined);
  }, []);

  const requestClose = useCallback(() => {
    closeRequestRef.current?.();
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

  const openSourceInEsql = useCallback(
    (nextSource: FlyoutSource, mode: ComposeDiscoverMode) => {
      setSource(nextSource);
      setFlyoutMode(mode);
      setBuilderType(null);
      setInitialBuilderState(undefined);
      openSession(mode);
    },
    [openSession]
  );

  const openInEsql = useCallback(
    (rule: RuleApiResponse, mode: ComposeDiscoverMode) =>
      openSourceInEsql({ kind: 'rule', rule }, mode),
    [openSourceInEsql]
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
      minimumScheduleInterval: getMinimumScheduleInterval(),
      esqlMenu: ESQLMenu,
      esqlEditorActionsProvider: EsqlEditorActionsProvider,
      esqlEditorActionsRegister: EsqlEditorActionsRegister,
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

  const openCreateFlyout = useCallback(() => {
    setSource(NEW_SOURCE);
    setFlyoutMode('create');
    setBuilderType(null);
    setInitialBuilderState(undefined);
    openSession('create');
  }, [openSession]);

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
      setSource(NEW_SOURCE);
      setFlyoutMode('create');
      setBuilderType(type);
      setInitialBuilderState(undefined);
      openSession('create');
    },
    [notifications.toasts, openCreateFlyout, openSession]
  );

  const openRuleFlyout = useCallback(
    (rule: RuleApiResponse, mode: ComposeDiscoverMode) => {
      const result = resolveBuilderMode(rule);
      if (result === 'esql') {
        openInEsql(rule, mode);
      } else if (result === 'esql-fallback') {
        requestEsqlFallback(rule, mode);
      } else {
        setSource({ kind: 'rule', rule });
        setFlyoutMode(mode);
        setBuilderType(result.builderType);
        setInitialBuilderState(result.initialBuilderState);
        openSession(mode);
      }
    },
    [resolveBuilderMode, openInEsql, requestEsqlFallback, openSession]
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
      const templateSource: FlyoutSource = { kind: 'template', template, rule: syntheticRule };
      const result = resolveBuilderMode(syntheticRule);
      if (result !== 'esql' && result !== 'esql-fallback') {
        setSource(templateSource);
        setFlyoutMode('create');
        setBuilderType(result.builderType);
        setInitialBuilderState(result.initialBuilderState);
        openSession('create');
      } else {
        openSourceInEsql(templateSource, 'create');
      }
    },
    [resolveBuilderMode, openSourceInEsql, openSession]
  );

  const flyout = flyoutOpen ? (
    <ComposeDiscoverFlyout
      key={flyoutGeneration}
      historyKey={sessionHistoryKey}
      mode={flyoutMode}
      rule={targetRule ?? undefined}
      ruleId={flyoutMode === 'edit' ? targetRule?.id : undefined}
      onClose={dismissFlyout}
      onHistoryBack={hideFlyout}
      closeRequestRef={closeRequestRef}
      stackedOnPicker={stackedOnPicker}
      services={ruleFormServices}
      builderType={builderType ?? undefined}
      initialBuilderState={initialBuilderState}
      onSwitchToEsql={builderType ? requestSwitchToEsql : undefined}
      onCreateRule={(payload) =>
        createRuleMutation.mutate({ payload, templateId }, { onSuccess: closeAndRedirect })
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
