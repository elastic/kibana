/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiLoadingSpinner } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import type {
  ComposeDiscoverFlyoutProps,
  DynamicRuleFormFlyoutProps,
} from '@kbn/alerting-v2-rule-form';
import { untilPluginStartServicesReady, type AlertingV2KibanaServices } from './kibana_services';
import { RuleCreateOptionsFlyout } from './components/rule_create_options/rule_create_options_flyout';
import { RulesApi } from './services/rules_api';
import { CREATE_WITH_AGENT_INITIAL_PROMPT, AGENT_BUILDER_NEW_CONVERSATION_PATH } from './constants';

export interface CreateRuleOptionsFlyoutLegacyItem {
  id: string;
  label: string;
  render: (onClose: () => void) => React.ReactElement | null;
  'data-test-subj'?: string;
}

export interface CreateRuleOptionsFlyoutProps {
  onClose: () => void;
  initialQuery?: string;
  esqlVariables?: ESQLControlVariable[];
  legacyRuleTypes?: CreateRuleOptionsFlyoutLegacyItem[];
  /**
   * When provided, the flyout reactively tracks the current ES|QL query
   * via `useSyncExternalStore`. This keeps the rule form in sync when
   * the user edits and submits the Discover query while the flyout is open.
   */
  subscribe?: (listener: () => void) => () => void;
  getQuery?: () => string | undefined;
  getEsqlVariables?: () => ESQLControlVariable[] | undefined;
}

type Step =
  | { type: 'selector' }
  | { type: 'esql' }
  | { type: 'threshold' }
  | { type: 'legacy'; id: string };

interface LoadedModules {
  services: AlertingV2KibanaServices;
  DynamicRuleFormFlyout: React.ComponentType<DynamicRuleFormFlyoutProps>;
  ComposeDiscoverFlyout: React.ComponentType<ComposeDiscoverFlyoutProps>;
}

const noopSubscribe = () => () => {};

const CreateRuleOptionsFlyoutInner = ({
  onClose,
  initialQuery,
  esqlVariables: staticEsqlVariables,
  legacyRuleTypes,
  subscribe,
  getQuery,
  getEsqlVariables,
}: CreateRuleOptionsFlyoutProps) => {
  const [step, setStep] = useState<Step>({ type: 'selector' });
  const [isSaving, setIsSaving] = useState(false);

  const reactiveQuery = useSyncExternalStore(
    subscribe ?? noopSubscribe,
    getQuery ?? (() => initialQuery)
  );
  const reactiveVariables = useSyncExternalStore(
    subscribe ?? noopSubscribe,
    getEsqlVariables ?? (() => staticEsqlVariables)
  );

  const query = reactiveQuery ?? initialQuery;
  const esqlVariables = reactiveVariables ?? staticEsqlVariables;

  const { loading, value } = useAsync(async (): Promise<LoadedModules> => {
    const [services, mod] = await Promise.all([
      untilPluginStartServicesReady(),
      import('@kbn/alerting-v2-rule-form'),
    ]);
    return {
      services,
      DynamicRuleFormFlyout: mod.DynamicRuleFormFlyout,
      ComposeDiscoverFlyout: mod.ComposeDiscoverFlyout,
    };
  }, []);

  const navigateToAgentBuilder = useCallback(() => {
    if (!value?.services) return;
    value.services.application.navigateToApp(AGENT_BUILDER_APP_ID, {
      path: AGENT_BUILDER_NEW_CONVERSATION_PATH,
      state: { initialMessage: CREATE_WITH_AGENT_INITIAL_PROMPT },
    });
    onClose();
  }, [value, onClose]);

  const historyKey = useMemo(() => Symbol('discoverCreateAlert'), []);

  const rulesApi = useMemo(
    () => (value?.services ? new RulesApi(value.services.http) : undefined),
    [value]
  );

  const handleCreateRule = useCallback(
    async (payload: CreateRuleData) => {
      if (!rulesApi || !value?.services) return;
      setIsSaving(true);
      try {
        const rule = await rulesApi.createRule(payload);
        value.services.notifications.toasts.addSuccess(
          i18n.translate('xpack.alertingV2.createAlertFlyout.createSuccess', {
            defaultMessage: 'Rule "{ruleName}" created successfully',
            values: { ruleName: rule.metadata.name },
          })
        );
        onClose();
      } catch (err) {
        value.services.notifications.toasts.addDanger(
          i18n.translate('xpack.alertingV2.createAlertFlyout.createError', {
            defaultMessage: 'Failed to create rule',
          })
        );
      } finally {
        setIsSaving(false);
      }
    },
    [rulesApi, value, onClose]
  );

  const legacyPanelItems = useMemo(
    () =>
      legacyRuleTypes?.map((item) => ({
        id: item.id,
        label: item.label,
        onClick: () => setStep({ type: 'legacy', id: item.id }),
        'data-test-subj': item['data-test-subj'],
      })),
    [legacyRuleTypes]
  );

  if (loading || !value) {
    return (
      <EuiFlyout
        type="push"
        size="s"
        ownFocus
        onClose={onClose}
        data-test-subj="createAlertFlyoutLoading"
      >
        <EuiFlyoutBody>
          <EuiLoadingSpinner size="l" />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  const { services, DynamicRuleFormFlyout, ComposeDiscoverFlyout } = value;

  if (step.type === 'esql') {
    return (
      <DynamicRuleFormFlyout
        query={query ?? ''}
        onClose={onClose}
        services={services}
        esqlVariables={esqlVariables}
      />
    );
  }

  if (step.type === 'threshold') {
    return (
      <ComposeDiscoverFlyout
        historyKey={historyKey}
        mode="create"
        onClose={onClose}
        services={services}
        builderType="threshold"
        onCreateRule={handleCreateRule}
        isSaving={isSaving}
      />
    );
  }

  if (step.type === 'legacy') {
    const legacyItem = legacyRuleTypes?.find((item) => item.id === step.id);
    if (legacyItem) {
      return legacyItem.render(onClose);
    }
  }

  return (
    <RuleCreateOptionsFlyout
      onClose={onClose}
      onCreateEsqlRule={() => setStep({ type: 'esql' })}
      onCreateWithAgent={navigateToAgentBuilder}
      onCreateThresholdAlert={() => setStep({ type: 'threshold' })}
      legacyRuleTypes={legacyPanelItems}
    />
  );
};

export const CreateRuleOptionsFlyout = (props: CreateRuleOptionsFlyoutProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <CreateRuleOptionsFlyoutInner {...props} />
    </QueryClientProvider>
  );
};
