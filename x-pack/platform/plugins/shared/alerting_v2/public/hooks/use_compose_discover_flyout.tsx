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

/**
 * A template whose rule carries builder fields has no query of its own — the
 * server generates it on save — so seed an empty one in the kind's own format
 * to open the editor the form would otherwise refuse to show.
 */
const emptyQueryFor = (kind: RuleApiResponse['kind']): RuleApiResponse['query'] =>
  kind === 'signal'
    ? { format: 'standalone', breach: { query: '' } }
    : { format: 'composed', base: '' };

const templateToSyntheticRule = (template: RuleTemplateResponse): RuleApiResponse => ({
  ...template.rule,
  query: template.rule.query ?? emptyQueryFor(template.rule.kind),
  id: '',
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
    version: 1,
    revision: 0,
    // Stamp template lineage so the synthetic draft reflects the actual source
    // the create payload will carry. The rule's content version starts at 1 for
    // a freshly-created rule regardless of the template's own version.
    source: { type: 'template' as const, id: template.id, version: 1 },
    // Step 4.4: ownership is server-derived; a template is a create payload so it
    // carries no ownership — default to { managed: false } for this synthetic draft.
    ownership: { managed: false } as const,
  },
});

interface UseComposeDiscoverFlyoutOptions {
  createSuccessRedirectPath?: string;
}

export const useComposeDiscoverFlyout = ({
  createSuccessRedirectPath,
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
  // Tracks the template id when the flyout was opened from a template, so the
  // create payload can be stamped with `{ type: 'template', id }`. Cleared on
  // every non-template open and on flyout close.
  const [templateSourceId, setTemplateSourceId] = useState<string | null>(null);
  const historyKey = useMemo(() => Symbol('ruleAuthoring'), []);

  const openInEsql = useCallback((rule: RuleApiResponse, mode: ComposeDiscoverMode) => {
    setTargetRule(rule);
    setFlyoutMode(mode);
    setBuilderType(null);
    setInitialBuilderState(undefined);
    setFlyoutOpen(true);
  }, []);

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
  const setupNotificationsMutation = useSetupRuleNotifications();
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

  const closeFlyout = useCallback(() => {
    setFlyoutOpen(false);
    setTargetRule(null);
    setBuilderType(null);
    setInitialBuilderState(undefined);
    setTemplateSourceId(null);
  }, []);

  const closeAndRedirect = useCallback(() => {
    setFlyoutOpen(false);
    setTemplateSourceId(null);
    if (createSuccessRedirectPath) {
      application.navigateToUrl(http.basePath.prepend(createSuccessRedirectPath));
    }
  }, [application, createSuccessRedirectPath, http]);

  const openCreateFlyout = useCallback(() => {
    setTargetRule(null);
    setFlyoutMode('create');
    setBuilderType(null);
    setTemplateSourceId(null);
    setFlyoutOpen(true);
  }, []);

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
        setTargetRule(null);
        setFlyoutMode('create');
        setBuilderType(null);
        setTemplateSourceId(null);
        setFlyoutOpen(true);
        return;
      }
      setTargetRule(null);
      setFlyoutMode('create');
      setBuilderType(type);
      setInitialBuilderState(undefined);
      setTemplateSourceId(null);
      setFlyoutOpen(true);
    },
    [notifications.toasts]
  );

  const openRuleFlyout = useCallback(
    (rule: RuleApiResponse, mode: ComposeDiscoverMode) => {
      // Non-template open — always clear any carried-over template source so it
      // cannot leak into an edit or clone submission.
      setTemplateSourceId(null);
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
        setFlyoutOpen(true);
      }
    },
    [resolveBuilderMode, openInEsql, requestEsqlFallback]
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
      // Store the template id so onCreateRule can stamp { type: 'template', id }
      // on the create payload — composeFormToCreateRequest does not carry source.
      setTemplateSourceId(template.id);
      if (result !== 'esql' && result !== 'esql-fallback') {
        setTargetRule(syntheticRule);
        setFlyoutMode('create');
        setBuilderType(result.builderType);
        setInitialBuilderState(result.initialBuilderState);
        setFlyoutOpen(true);
      } else {
        openInEsql(syntheticRule, 'create');
      }
    },
    [resolveBuilderMode, openInEsql]
  );

  const flyout = flyoutOpen ? (
    <ComposeDiscoverFlyout
      historyKey={historyKey}
      mode={flyoutMode}
      rule={targetRule ?? undefined}
      ruleId={flyoutMode === 'edit' ? targetRule?.id : undefined}
      onClose={closeFlyout}
      services={ruleFormServices}
      builderType={builderType ?? undefined}
      initialBuilderState={initialBuilderState}
      onSwitchToEsql={builderType ? requestSwitchToEsql : undefined}
      onCreateRule={(payload, ruleNotifications) => {
        // Stamp the template source when the flyout was opened from a template.
        // composeFormToCreateRequest never includes metadata.source, so the
        // server would otherwise default the rule to { type: 'internal' }.
        const payloadWithSource = templateSourceId
          ? {
              ...payload,
              metadata: {
                ...payload.metadata,
                source: { type: 'template' as const, id: templateSourceId, version: 1 },
              },
            }
          : payload;
        createRuleMutation.mutate(
          { payload: payloadWithSource },
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
              setupNotificationsMutation.mutate(
                { rule: ruleForNotifications, actions },
                { onSuccess: closeAndRedirect, onError: closeAndRedirect }
              );
            },
          }
        );
      }}
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
              // Only close the flyout once notification setup also succeeds
              setupNotificationsMutation.mutate(
                { rule: ruleForNotifications, actions },
                { onSuccess: closeFlyout }
              );
            },
          }
        )
      }
      isSaving={
        createRuleMutation.isLoading ||
        setupNotificationsMutation.isLoading ||
        updateRuleMutation.isLoading
      }
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
  };
};
