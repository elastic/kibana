/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { Container } from 'inversify';
import type { CoreStart, ChromeBreadcrumb } from '@kbn/core/public';
import { Context } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { AppHeaderTab } from '@kbn/app-header';
import type { EpisodeAction, EpisodeActionsDeps } from '@kbn/alerting-v2-episodes-ui/actions';
import { RulesApp } from './rules_app';
import { RuleLibraryApp } from './rule_library_app';
import { ActionPoliciesApp } from './action_policies_app';
import { EpisodesApp } from './episodes_app';
import { ExecutionHistoryApp } from './execution_history_app';
import { BreadcrumbProvider } from './breadcrumb_context';
import { LocatorProvider } from './locator_context';
import { TabsProvider } from './tabs_context';
import { bindLocatorsToHost, getAlertingV2Locators } from './bind_locators_to_host';
import type { AlertingV2HostApp } from '../locators';
import { PrivilegeCheckProvider, type PrivilegeCheck } from './privilege_check_context';
import { AlertingV2AlertsProvider } from './alerts_provider';
import { ManageRulesHrefProvider } from './manage_rules_href_context';

export interface AlertingV2PageProps {
  coreStart: CoreStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  hostApp: AlertingV2HostApp;
  privilegeCheck?: PrivilegeCheck;
  tabs?: AppHeaderTab[];
  createActions?: (deps: EpisodeActionsDeps) => EpisodeAction[];
  manageRulesHref?: string;
}

/** Internal props — includes the DI container injected by the lazy wrapper. */
export interface InternalPageProps extends AlertingV2PageProps {
  container: Container;
}

const StandardProviders = ({
  container,
  setBreadcrumbs,
  hostApp,
  privilegeCheck,
  tabs,
  children,
}: {
  container: Container;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  hostApp: AlertingV2HostApp;
  privilegeCheck?: PrivilegeCheck;
  tabs?: AppHeaderTab[];
  children: React.ReactNode;
}) => {
  const [queryClient] = useState(() => new QueryClient());
  const locators = useMemo(() => {
    const share = container.get(PluginStart('share')) as SharePluginStart;
    return bindLocatorsToHost(getAlertingV2Locators(share), hostApp);
  }, [container, hostApp]);
  return (
    <Context.Provider value={container}>
      <QueryClientProvider client={queryClient}>
        <LocatorProvider locators={locators}>
          <TabsProvider tabs={tabs}>
            <BreadcrumbProvider setBreadcrumbs={setBreadcrumbs}>
              <PrivilegeCheckProvider value={privilegeCheck}>
                <I18nProvider>{children}</I18nProvider>
              </PrivilegeCheckProvider>
            </BreadcrumbProvider>
          </TabsProvider>
        </LocatorProvider>
      </QueryClientProvider>
    </Context.Provider>
  );
};

export const AlertingV2RulesPage = ({
  container,
  setBreadcrumbs,
  hostApp,
  privilegeCheck,
  tabs,
}: InternalPageProps) => (
  <StandardProviders
    container={container}
    setBreadcrumbs={setBreadcrumbs}
    hostApp={hostApp}
    privilegeCheck={privilegeCheck}
    tabs={tabs}
  >
    <RulesApp />
  </StandardProviders>
);

export const AlertingV2RuleLibraryPage = ({
  container,
  setBreadcrumbs,
  hostApp,
  privilegeCheck,
}: InternalPageProps) => (
  <StandardProviders
    container={container}
    setBreadcrumbs={setBreadcrumbs}
    hostApp={hostApp}
    privilegeCheck={privilegeCheck}
  >
    <RuleLibraryApp />
  </StandardProviders>
);

export const AlertingV2ActionPoliciesPage = ({
  container,
  setBreadcrumbs,
  hostApp,
  privilegeCheck,
}: InternalPageProps) => (
  <StandardProviders
    container={container}
    setBreadcrumbs={setBreadcrumbs}
    hostApp={hostApp}
    privilegeCheck={privilegeCheck}
  >
    <ActionPoliciesApp />
  </StandardProviders>
);

export const AlertingV2ExecutionHistoryPage = ({
  container,
  setBreadcrumbs,
  hostApp,
  privilegeCheck,
}: InternalPageProps) => (
  <StandardProviders
    container={container}
    setBreadcrumbs={setBreadcrumbs}
    hostApp={hostApp}
    privilegeCheck={privilegeCheck}
  >
    <ExecutionHistoryApp />
  </StandardProviders>
);

export const AlertingV2EpisodesPage = ({
  coreStart,
  container,
  setBreadcrumbs,
  hostApp,
  privilegeCheck,
  createActions,
  manageRulesHref,
}: InternalPageProps) => (
  <AlertingV2AlertsProvider
    coreStart={coreStart}
    container={container}
    hostApp={hostApp}
    privilegeCheck={privilegeCheck}
    createActions={createActions}
  >
    <BreadcrumbProvider setBreadcrumbs={setBreadcrumbs}>
      <ManageRulesHrefProvider value={manageRulesHref}>
        <EpisodesApp />
      </ManageRulesHrefProvider>
    </BreadcrumbProvider>
  </AlertingV2AlertsProvider>
);
