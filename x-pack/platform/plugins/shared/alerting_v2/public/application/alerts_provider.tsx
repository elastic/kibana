/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import type { Container } from 'inversify';
import type { CoreStart } from '@kbn/core/public';
import { Context, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import { EpisodeDataSourceProvider } from '@kbn/alerting-v2-episodes-ui/context/episode_data_source_context';
import {
  AlertHostProvider,
  type AlertHostContextValue,
} from '@kbn/alerting-v2-episodes-ui/context/alert_host_context';
import type { EpisodeDataSource } from '@kbn/alerting-v2-episodes-ui/types/episode_data_source';
import type { EpisodeAction, EpisodeActionsDeps } from '@kbn/alerting-v2-episodes-ui/actions';
import { LocatorProvider } from './locator_context';
import { PrivilegeCheckProvider, type PrivilegeCheck } from './privilege_check_context';
import { bindLocatorsToHost, getAlertingV2Locators } from './bind_locators_to_host';
import type { AlertingV2HostApp } from '../locators';
import type { AlertsKibanaServices } from '../alerts_kibana_services';
import { CLASSIC_ALERTS_DATA_SOURCE } from '../alert_sources';
import { UserCapabilities } from '../services/user_capabilities';
import type { RuleApiResponse } from '../services/rules_api';
import type { ComposeTarget } from './compose_rule_flyout';

const RuleSummaryFlyout = lazy(() =>
  import('../components/rule/flyouts/rule_summary/rule_summary_flyout_container').then((m) => ({
    default: m.RuleSummaryFlyoutContainer,
  }))
);

const ComposeRuleFlyout = lazy(() => import('./compose_rule_flyout'));

const alertsStorage = new Storage(localStorage);

export interface AlertingV2AlertsProviderProps {
  coreStart: CoreStart;
  hostApp: AlertingV2HostApp;
  privilegeCheck?: PrivilegeCheck;
  dataSource?: EpisodeDataSource;
  createActions?: (deps: EpisodeActionsDeps) => EpisodeAction[];
  children: React.ReactNode;
}

export interface InternalAlertsProviderProps extends AlertingV2AlertsProviderProps {
  container: Container;
}

const AlertHostScope = ({
  dataSource,
  hrefs,
  children,
}: {
  dataSource: EpisodeDataSource;
  hrefs: Pick<AlertHostContextValue, 'getRuleDetailsHref' | 'getEpisodeDetailsHref'>;
  children: React.ReactNode;
}) => {
  const userCapabilities = useService(UserCapabilities);
  const queryV2Source = userCapabilities.canRead('alerts');
  const canWriteAlerts = userCapabilities.canWrite('alerts');

  const [openRule, setOpenRule] = useState<
    { ruleId: string; sourceRuleInfo?: { category?: string } } | undefined
  >();
  const [composeTarget, setComposeTarget] = useState<
    (ComposeTarget & { attempt: number }) | undefined
  >();

  const closeRuleFlyout = useCallback(() => setOpenRule(undefined), []);
  const openRuleFlyout = useCallback(
    (ruleId: string, sourceRuleInfo?: { category?: string }) =>
      setOpenRule({ ruleId, sourceRuleInfo }),
    []
  );

  const compose = useCallback((mode: ComposeTarget['mode'], rule: RuleApiResponse) => {
    setOpenRule(undefined);
    setComposeTarget((previous) => ({ mode, rule, attempt: (previous?.attempt ?? 0) + 1 }));
  }, []);

  const hostValue: AlertHostContextValue = useMemo(
    () => ({ ...hrefs, openRuleFlyout, closeRuleFlyout, canWriteAlerts }),
    [hrefs, openRuleFlyout, closeRuleFlyout, canWriteAlerts]
  );

  return (
    <EpisodeDataSourceProvider dataSource={dataSource} queryV2Source={queryV2Source}>
      <AlertHostProvider value={hostValue}>
        {children}
        {openRule ? (
          <Suspense fallback={null}>
            <RuleSummaryFlyout
              ruleId={openRule.ruleId}
              sourceRuleInfo={openRule.sourceRuleInfo}
              onClose={closeRuleFlyout}
              onEdit={(rule) => compose('edit', rule)}
              onClone={(rule) => compose('clone', rule)}
            />
          </Suspense>
        ) : null}
        {composeTarget ? (
          <Suspense fallback={null}>
            <ComposeRuleFlyout
              key={`${composeTarget.rule.id}:${composeTarget.attempt}`}
              target={composeTarget}
            />
          </Suspense>
        ) : null}
      </AlertHostProvider>
    </EpisodeDataSourceProvider>
  );
};

export const AlertingV2AlertsProvider = ({
  coreStart,
  container,
  hostApp,
  privilegeCheck,
  dataSource: dataSourceProp,
  createActions,
  children,
}: InternalAlertsProviderProps) => {
  const [queryClient] = useState(() => new QueryClient());

  const locators = useMemo(() => {
    const share = container.get(PluginStart('share')) as SharePluginStart;
    return bindLocatorsToHost(getAlertingV2Locators(share), hostApp);
  }, [container, hostApp]);

  const dataSource: EpisodeDataSource = useMemo(() => {
    const source = dataSourceProp ?? CLASSIC_ALERTS_DATA_SOURCE;
    return createActions ? { ...source, createActions } : source;
  }, [dataSourceProp, createActions]);

  const hrefs = useMemo(
    () => ({
      getRuleDetailsHref: (ruleId: string, isSourceRule?: boolean): string | undefined => {
        if (isSourceRule) {
          const sourceHref = dataSource.getRuleDetailsHref?.(ruleId);
          return sourceHref ? coreStart.http.basePath.prepend(sourceHref) : undefined;
        }
        return locators.rulesLocators.getRedirectUrl({ ruleId });
      },
      getEpisodeDetailsHref: (episodeId: string) =>
        locators.episodesLocators.getRedirectUrl({ episodeId }),
    }),
    [locators, dataSource, coreStart.http.basePath]
  );

  const kibanaReactServices: AlertsKibanaServices = useMemo(
    () => ({
      ...coreStart,
      share: container.get(PluginStart('share')) as SharePluginStart,
      data: container.get(PluginStart('data')) as DataPublicPluginStart,
      dataViews: container.get(PluginStart('dataViews')) as DataViewsPublicPluginStart,
      expressions: container.get(PluginStart('expressions')) as ExpressionsStart,
      uiActions: container.get(PluginStart('uiActions')) as UiActionsStart,
      fieldFormats: container.get(PluginStart('fieldFormats')) as FieldFormatsStart,
      lens: container.get(PluginStart('lens')) as LensPublicStart,
      charts: container.get(PluginStart('charts')) as ChartsPluginStart,
      storage: alertsStorage,
      toastNotifications: coreStart.notifications.toasts,
      unifiedDocViewer: container.get(PluginStart('unifiedDocViewer')) as UnifiedDocViewerStart,
      spaces: container.get(PluginStart('spaces')) as SpacesPluginStart,
    }),
    [coreStart, container]
  );

  return (
    <KibanaContextProvider services={kibanaReactServices}>
      <Context.Provider value={container}>
        <QueryClientProvider client={queryClient}>
          <LocatorProvider locators={locators}>
            <PrivilegeCheckProvider value={privilegeCheck}>
              <I18nProvider>
                <AlertHostScope dataSource={dataSource} hrefs={hrefs}>
                  {children}
                </AlertHostScope>
              </I18nProvider>
            </PrivilegeCheckProvider>
          </LocatorProvider>
        </QueryClientProvider>
      </Context.Provider>
    </KibanaContextProvider>
  );
};
