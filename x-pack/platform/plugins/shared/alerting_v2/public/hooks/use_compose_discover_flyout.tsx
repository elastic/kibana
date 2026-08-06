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
import { ComposeDiscoverFlyout, RULE_BUILDER_REGISTRY } from '@kbn/alerting-v2-rule-form';
import { getBreachEsqlQuery, getRecoverEsqlQuery } from '@kbn/alerting-v2-schemas';
import type { IHttpFetchError } from '@kbn/core/public';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { RuleApiResponse } from '../services/rules_api';
import { useCreateRule } from './use_create_rule';
import { useSetupRuleNotifications } from './use_setup_rule_notifications';
import { useUpdateRule } from './use_update_rule';

const tryParseBuilderState = (
  type: string,
  query: string,
  recoveryQuery?: string
): BuilderState | null => {
  const definition = RULE_BUILDER_REGISTRY[type];
  if (definition?.parseState) {
    return definition.parseState(query, recoveryQuery);
  }
  return null;
};

interface UseComposeDiscoverFlyoutOptions {
  createSuccessRedirectPath?: string;
}

export const useComposeDiscoverFlyout = ({
  createSuccessRedirectPath,
}: UseComposeDiscoverFlyoutOptions = {}) => {
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const i18nStart = useService(CoreStart('i18n'));
  const theme = useService(CoreStart('theme'));
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
  const historyKey = useMemo(() => Symbol('ruleAuthoring'), []);
  const navigateToQueryStepRef = useRef<(() => void) | null>(null);

  /*
   * Temporary: until composed alerts can persist an empty breach segment, a
   * conditionless alert save 400s. Offer a Review query action that jumps back
   * to step 0; everything else uses the hook's default enriched toast.
   */
  const handleCreateErrorToast = useCallback(
    (error: Error, showDefaultToast: () => void) => {
      if ((error as IHttpFetchError).response?.status !== 400) {
        showDefaultToast();
        return;
      }
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.alertingV2.hooks.useCreateRule.errorMessage', {
          defaultMessage: 'Rule not created',
        }),
        text: toMountPoint(
          <FormattedMessage
            id="xpack.alertingV2.useComposeDiscoverFlyout.badRequestToast"
            defaultMessage="The rule could not be saved because some fields are invalid. {reviewQuery}"
            values={{
              reviewQuery: (
                <EuiLink
                  data-test-subj="composeDiscoverReviewQueryToastAction"
                  onClick={() => navigateToQueryStepRef.current?.()}
                >
                  {i18n.translate('xpack.alertingV2.useComposeDiscoverFlyout.reviewQueryAction', {
                    defaultMessage: 'Review query',
                  })}
                </EuiLink>
              ),
            }}
          />,
          { i18n: i18nStart, theme }
        ),
      });
    },
    [i18nStart, notifications.toasts, theme]
  );

  const handleUpdateErrorToast = useCallback(
    (error: Error, showDefaultToast: () => void) => {
      if ((error as IHttpFetchError).response?.status !== 400) {
        showDefaultToast();
        return;
      }
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.alertingV2.hooks.useUpdateRule.errorMessage', {
          defaultMessage: 'Edits not saved',
        }),
        text: toMountPoint(
          <FormattedMessage
            id="xpack.alertingV2.useComposeDiscoverFlyout.badRequestToast"
            defaultMessage="The rule could not be saved because some fields are invalid. {reviewQuery}"
            values={{
              reviewQuery: (
                <EuiLink
                  data-test-subj="composeDiscoverReviewQueryToastAction"
                  onClick={() => navigateToQueryStepRef.current?.()}
                >
                  {i18n.translate('xpack.alertingV2.useComposeDiscoverFlyout.reviewQueryAction', {
                    defaultMessage: 'Review query',
                  })}
                </EuiLink>
              ),
            }}
          />,
          { i18n: i18nStart, theme }
        ),
      });
    },
    [i18nStart, notifications.toasts, theme]
  );

  const createRuleMutation = useCreateRule({ onErrorToast: handleCreateErrorToast });
  const setupNotificationsMutation = useSetupRuleNotifications();
  const updateRuleMutation = useUpdateRule({ onErrorToast: handleUpdateErrorToast });
  const ruleFormServices = useMemo<RuleFormServices>(
    () => ({
      http,
      data,
      dataViews,
      notifications,
      application,
      lens,
      uiActions,
      dashboard,
      cps,
    }),
    [http, data, dataViews, notifications, application, lens, uiActions, dashboard, cps]
  );

  const closeFlyout = useCallback(() => {
    setFlyoutOpen(false);
    setTargetRule(null);
    setBuilderType(null);
    setInitialBuilderState(undefined);
  }, []);

  const closeAndRedirect = useCallback(() => {
    setFlyoutOpen(false);
    if (createSuccessRedirectPath) {
      application.navigateToUrl(http.basePath.prepend(createSuccessRedirectPath));
    }
  }, [application, createSuccessRedirectPath, http]);

  const openCreateFlyout = useCallback(() => {
    setTargetRule(null);
    setFlyoutMode('create');
    setBuilderType(null);
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
        setFlyoutOpen(true);
        return;
      }
      setTargetRule(null);
      setFlyoutMode('create');
      setBuilderType(type);
      setInitialBuilderState(undefined);
      setFlyoutOpen(true);
    },
    [notifications.toasts]
  );

  const openRuleFlyout = useCallback(
    (rule: RuleApiResponse, mode: ComposeDiscoverMode) => {
      setTargetRule(rule);
      setFlyoutMode(mode);

      if (rule.metadata.builder_type) {
        const query = rule.query ? getBreachEsqlQuery(rule.query) : '';
        const recoveryQuery = rule.query
          ? getRecoverEsqlQuery(rule.query, rule.recovery_strategy)
          : undefined;
        const state = query
          ? tryParseBuilderState(rule.metadata.builder_type, query, recoveryQuery)
          : null;
        if (state && typeof state === 'object') {
          const stateWithTimeField = { ...state, timeField: rule.time_field ?? '@timestamp' };
          setBuilderType(rule.metadata.builder_type);
          setInitialBuilderState(stateWithTimeField);
          setFlyoutOpen(true);
          return;
        }
        notifications.toasts.addInfo({
          title: i18n.translate('xpack.alertingV2.useComposeDiscoverFlyout.esqlFallbackTitle', {
            defaultMessage: 'Rule opened in ES|QL mode',
          }),
          text: i18n.translate('xpack.alertingV2.useComposeDiscoverFlyout.esqlFallbackText', {
            defaultMessage:
              'This rule was created with a builder but its query has been modified. It can only be edited as ES|QL.',
          }),
        });
      }

      setBuilderType(null);
      setInitialBuilderState(undefined);
      setFlyoutOpen(true);
    },
    [notifications.toasts]
  );

  const openEditFlyout = useCallback(
    (rule: RuleApiResponse) => openRuleFlyout(rule, 'edit'),
    [openRuleFlyout]
  );

  const openCloneFlyout = useCallback(
    (rule: RuleApiResponse) => openRuleFlyout(rule, 'clone'),
    [openRuleFlyout]
  );

  const handleProvideQueryStepNavigator = useCallback((navigate: () => void) => {
    navigateToQueryStepRef.current = navigate;
  }, []);

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
      onProvideQueryStepNavigator={handleProvideQueryStepNavigator}
      onCreateRule={async (payload, ruleNotifications) => {
        // Rejection propagates to the flyout (stays mounted). onErrorToast
        // already surfaced the failure, including the Review query action.
        const rule = await createRuleMutation.mutateAsync(payload);
        const actions = ruleNotifications?.workflows ?? [];
        if (actions.length > 0) {
          setupNotificationsMutation.mutate(
            { rule, actions },
            { onSuccess: closeAndRedirect, onError: closeAndRedirect }
          );
        } else {
          closeAndRedirect();
        }
      }}
      onUpdateRule={async (id, payload, ruleNotifications) => {
        const rule = await updateRuleMutation.mutateAsync({ id, payload });
        const actions = ruleNotifications?.workflows ?? [];
        if (actions.length === 0) {
          closeFlyout();
          return;
        }
        // Only close the flyout once notification setup also succeeds
        setupNotificationsMutation.mutate({ rule, actions }, { onSuccess: closeFlyout });
      }}
      isSaving={
        createRuleMutation.isLoading ||
        setupNotificationsMutation.isLoading ||
        updateRuleMutation.isLoading
      }
    />
  ) : null;

  return {
    flyout,
    openCreateFlyout,
    openCreateBuilderFlyout,
    openEditFlyout,
    openCloneFlyout,
  };
};
