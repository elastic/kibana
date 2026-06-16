/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiLoadingSpinner } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { History } from 'history';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import type { ComposeDiscoverFlyoutProps } from '@kbn/alerting-v2-rule-form';
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
   * via `useSyncExternalStore`. Updates propagate into the compose form only
   * while the form has not been edited; after that, use the sandbox to adjust
   * the query.
   */
  subscribe?: (listener: () => void) => () => void;
  getQuery?: () => string | undefined;
  getEsqlVariables?: () => ESQLControlVariable[] | undefined;
  /** Scoped history of the host app — used to close the flyout on in-app navigation. */
  history?: History;
}

type Step =
  | { type: 'selector' }
  | { type: 'esql' }
  | { type: 'threshold' }
  | { type: 'legacy'; id: string };

interface LoadedModules {
  services: AlertingV2KibanaServices;
  ComposeDiscoverFlyout: React.ComponentType<ComposeDiscoverFlyoutProps>;
}

const noopSubscribe = () => () => {};

interface DiscoverQuerySnapshot {
  query: string | undefined;
  esqlVariables: ESQLControlVariable[] | undefined;
}

const CreateRuleOptionsFlyoutInner = ({
  onClose,
  initialQuery,
  esqlVariables: staticEsqlVariables,
  legacyRuleTypes,
  subscribe,
  getQuery,
  getEsqlVariables,
  history,
}: CreateRuleOptionsFlyoutProps) => {
  const [step, setStep] = useState<Step>({ type: 'selector' });
  const [isSaving, setIsSaving] = useState(false);

  const snapshotRef = useRef<DiscoverQuerySnapshot>({
    query: getQuery?.() ?? initialQuery,
    esqlVariables: getEsqlVariables?.() ?? staticEsqlVariables,
  });

  const wrappedSubscribe = useCallback(
    (listener: () => void) => {
      const query = getQuery?.() ?? initialQuery;
      const esqlVariables = getEsqlVariables?.() ?? staticEsqlVariables;
      const prev = snapshotRef.current;
      if (prev.query !== query || prev.esqlVariables !== esqlVariables) {
        snapshotRef.current = { query, esqlVariables };
      }

      return (subscribe ?? noopSubscribe)(() => {
        const nextQuery = getQuery?.() ?? initialQuery;
        const nextVariables = getEsqlVariables?.() ?? staticEsqlVariables;
        const current = snapshotRef.current;
        if (current.query !== nextQuery || current.esqlVariables !== nextVariables) {
          snapshotRef.current = { query: nextQuery, esqlVariables: nextVariables };
        }
        listener();
      });
    },
    [subscribe, getQuery, getEsqlVariables, initialQuery, staticEsqlVariables]
  );

  const getDiscoverQuerySnapshot = useCallback(() => snapshotRef.current, []);

  const { query, esqlVariables } = useSyncExternalStore(wrappedSubscribe, getDiscoverQuerySnapshot);

  const { loading, value } = useAsync(async (): Promise<LoadedModules> => {
    const [services, mod] = await Promise.all([
      untilPluginStartServicesReady(),
      import('@kbn/alerting-v2-rule-form'),
    ]);
    return {
      services,
      ComposeDiscoverFlyout: mod.ComposeDiscoverFlyout,
    };
  }, []);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!history) {
      return;
    }

    const initialPathname = history.location.pathname;
    const unlistenHistory = history.listen((location) => {
      if (location.pathname !== initialPathname) {
        onCloseRef.current();
      }
    });

    return () => {
      unlistenHistory();
    };
  }, [history]);

  useEffect(() => {
    if (!value?.services) {
      return;
    }

    const { application } = value.services;
    let initialAppId: string | undefined;

    const appChangeSubscription = application.currentAppId$.subscribe((appId) => {
      if (initialAppId === undefined) {
        initialAppId = appId;
        return;
      }
      if (appId !== initialAppId) {
        onCloseRef.current();
      }
    });

    return () => {
      appChangeSubscription.unsubscribe();
    };
  }, [value?.services]);

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

  const { services, ComposeDiscoverFlyout } = value;

  if (step.type === 'esql') {
    return (
      <ComposeDiscoverFlyout
        historyKey={historyKey}
        mode="create"
        onClose={onClose}
        services={services}
        onCreateRule={handleCreateRule}
        isSaving={isSaving}
        initialQuery={query}
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
