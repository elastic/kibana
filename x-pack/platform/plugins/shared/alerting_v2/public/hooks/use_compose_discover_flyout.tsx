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
import {
  ComposeDiscoverFlyout,
  RULE_BUILDER_REGISTRY,
  resolveRuleNotificationTag,
  ruleHasNotificationTag,
} from '@kbn/alerting-v2-rule-form';
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
import { RulesApi } from '../services/rules_api';
import { useBuilderToEsqlTransition } from './use_builder_to_esql_transition';
import { useCreateRule } from './use_create_rule';
import { useSetupRuleNotifications } from './use_setup_rule_notifications';
import { useUpdateRule } from './use_update_rule';

const templateToSyntheticRule = (template: RuleTemplateResponse): RuleApiResponse => ({
  ...template.rule,
  id: '',
  enabled: false,
  created_by: null,
  created_at: new Date().toISOString(),
  updated_by: null,
  updated_at: new Date().toISOString(),
  metadata: {
    ...template.rule.metadata,
    version: 1,
  },
});

interface UseComposeDiscoverFlyoutOptions {
  createSuccessRedirectPath?: string;
  /**
   * Shared EUI flyout history key. When provided (rules-list create session), the
   * authoring flyout joins the option picker's history so Back returns to the picker.
   */
  historyKey?: symbol;
  /** Called after a successful create so a stacked option picker can close too. */
  onCreateSuccess?: () => void;
  /** Called when the authoring flyout is dismissed (X / ESC), not on Back or save. */
  onDismiss?: () => void;
}

interface CloseFlyoutOptions {
  /**
   * When true, also run `onDismiss` so a stacked picker closes. User X / ESC /
   * picker dismiss pass this; create/update success must not.
   */
  callOnDismiss?: boolean;
}

export const useComposeDiscoverFlyout = ({
  createSuccessRedirectPath,
  historyKey: sharedHistoryKey,
  onCreateSuccess,
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

  const closeFlyout = useCallback(
    (options?: CloseFlyoutOptions) => {
      hideFlyout();
      if (options?.callOnDismiss) {
        onDismiss?.();
      }
    },
    [hideFlyout, onDismiss]
  );

  const dismissFlyout = useCallback(() => {
    closeFlyout({ callOnDismiss: true });
  }, [closeFlyout]);

  const closeAndRedirect = useCallback(() => {
    hideFlyout();
    onCreateSuccess?.();
    if (createSuccessRedirectPath) {
      application.navigateToUrl(http.basePath.prepend(createSuccessRedirectPath));
    }
  }, [application, createSuccessRedirectPath, hideFlyout, http, onCreateSuccess]);

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

  const rulesApi = useService(RulesApi);
  const createRuleMutation = useCreateRule();
  const setupCreateNotifications = useSetupRuleNotifications({ mode: 'create' });
  const setupUpdateNotifications = useSetupRuleNotifications({ mode: 'update' });
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

  /**
   * Ensures the rule carries a usable notification tag before linking action policies.
   * Mirrors the `resolveRuleNotificationTag` guard (`tags[0]?.trim()`) so both use the
   * same definition of "has a tag". If the write fails, shows a warning toast and returns
   * `null` — the caller must abort notification setup in that case.
   */
  const ensureNotificationTag = useCallback(
    async (rule: RuleApiResponse): Promise<RuleApiResponse | null> => {
      if (ruleHasNotificationTag(rule.metadata)) return rule;
      try {
        return await rulesApi.updateRule(rule.id, {
          metadata: { tags: [resolveRuleNotificationTag(rule.metadata)] },
        });
      } catch {
        notifications.toasts.addWarning({
          title: i18n.translate(
            'xpack.alertingV2.useComposeDiscoverFlyout.notificationTagWriteFailedTitle',
            { defaultMessage: 'Notifications not linked' }
          ),
          text: i18n.translate(
            'xpack.alertingV2.useComposeDiscoverFlyout.notificationTagWriteFailedText',
            {
              defaultMessage:
                'The rule was saved but could not be tagged for notification matching. Add a tag to the rule and retry linking notifications.',
            }
          ),
        });
        return null;
      }
    },
    [notifications.toasts, rulesApi]
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
      key={`${flyoutMode}:${builderType ?? 'esql'}:${targetRule?.id ?? 'new'}:${flyoutGeneration}`}
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
      onCreateRule={(payload, ruleNotifications) =>
        createRuleMutation.mutate(
          { payload },
          {
            onSuccess: async (rule) => {
              const actions = ruleNotifications?.workflows ?? [];
              if (actions.length === 0) {
                closeAndRedirect();
                return;
              }
              const ruleForNotifications = await ensureNotificationTag(rule);
              if (!ruleForNotifications) {
                closeAndRedirect();
                return;
              }
              setupCreateNotifications.mutate(
                { rule: ruleForNotifications, actions },
                { onSuccess: closeAndRedirect, onError: closeAndRedirect }
              );
            },
          }
        )
      }
      onUpdateRule={(id, payload, ruleNotifications) =>
        updateRuleMutation.mutate(
          { id, payload },
          {
            onSuccess: async (rule) => {
              const actions = ruleNotifications?.workflows ?? [];
              if (actions.length === 0) {
                closeFlyout();
                return;
              }
              const ruleForNotifications = await ensureNotificationTag(rule);
              if (!ruleForNotifications) {
                closeFlyout();
                return;
              }
              // Stay open on failure so the user can fix connectors and re-submit.
              setupUpdateNotifications.mutate(
                { rule: ruleForNotifications, actions },
                { onSuccess: () => closeFlyout() }
              );
            },
          }
        )
      }
      isSaving={
        createRuleMutation.isLoading ||
        setupCreateNotifications.isLoading ||
        setupUpdateNotifications.isLoading ||
        updateRuleMutation.isLoading
      }
    />
  ) : null;

  return {
    flyout,
    confirmationModal,
    closeFlyout,
    openCreateFlyout,
    openCreateBuilderFlyout,
    openCreateFromTemplateFlyout,
    openEditFlyout,
    openCloneFlyout,
    isOpen: flyoutOpen,
    requestClose,
  };
};
