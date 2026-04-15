/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useCallback } from 'react';

import { EMPTY } from 'rxjs';
import type { Decorator } from '@storybook/react';
import { createBrowserHistory } from 'history';

import { I18nProvider } from '@kbn/i18n-react';

import type {
  PluginsServiceStart,
  PricingServiceStart,
  SecurityServiceStart,
  UserProfileServiceStart,
} from '@kbn/core/public';
import { CoreScopedHistory } from '@kbn/core/public';
import { coreFeatureFlagsMock } from '@kbn/core/public/mocks';
import { getStorybookContextProvider } from '@kbn/custom-integrations-plugin/storybook';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { CoreDiServiceStart } from '@kbn/core-di';

import type { DashboardStart } from '@kbn/dashboard-plugin/public';

import { IntegrationsAppContext } from '../../public/applications/integrations/app';
import type { FleetConfigType, FleetStartServices } from '../../public/plugin';
import { ExperimentalFeaturesService } from '../../public/services';

// TODO: These are contract leaks, and should be on the context, rather than a setter.
import { setHttpClient } from '../../public/hooks/use_request';
import { setCustomIntegrations } from '../../public/services/custom_integrations';

import { getApplication } from './application';
import { getChrome } from './chrome';
import { getHttp } from './http';
import { getUiSettings, getSettings } from './ui_settings';
import { getNotifications } from './notifications';
import { stubbedStartServices } from './stubs';
import { getDocLinks } from './doc_links';
import { getCloud } from './cloud';
import { getShare } from './share';
import { getExecutionContext } from './execution_context';
import { getCustomBranding } from './custom_branding';
import { getRendering } from './rendering';

// TODO: clintandrewhall - this is not ideal, or complete.  The root context of Fleet applications
// requires full start contracts of its dependencies.  As a result, we have to mock all of those contracts
// with Storybook equivalents.  This is a temporary solution, and should be replaced with a more complete
// mock later, (or, ideally, Fleet starts to use a service abstraction).
//
// Expect this to grow as components that are given Stories need access to mocked services.
export const StorybookContext: React.FC<{
  children: React.ReactNode;
  storyContext?: Parameters<Decorator>;
}> = ({ storyContext, children: storyChildren }) => {
  const basepath = '';
  const browserHistory = createBrowserHistory();
  const history = new CoreScopedHistory(browserHistory, basepath);

  const isCloudEnabled = Boolean(storyContext?.[1].args.isCloudEnabled);
  // @ts-ignore {} no assignable to parameter
  ExperimentalFeaturesService.init({});
  const startServices: FleetStartServices = useMemo(
    () => ({
      ...stubbedStartServices,
      analytics: {
        registerContextProvider: () => {},
        registerEventType: () => {},
        registerShipper: () => {},
        reportEvent: () => {},
        optIn: () => {},
        telemetryCounter$: EMPTY,
      },
      embeddable: {} as unknown as EmbeddableStart,
      logsDataAccess: {} as unknown as LogsDataAccessPluginStart,
      application: getApplication(),
      executionContext: getExecutionContext(),
      featureFlags: coreFeatureFlagsMock.createStart(),
      chrome: getChrome(),
      cloud: {
        ...getCloud({ isCloudEnabled }),
        CloudContextProvider: ({ children }) => <>{children}</>,
      },
      customIntegrations: {
        ContextProvider: getStorybookContextProvider(),
        languageClientsUiComponents: {},
      },
      customBranding: getCustomBranding(),
      rendering: getRendering(),
      dashboard: {} as unknown as DashboardStart,
      docLinks: getDocLinks(),
      http: getHttp(),
      i18n: {
        Context: function I18nContext({ children }) {
          return <I18nProvider>{children}</I18nProvider>;
        },
      },
      injection: {} as unknown as CoreDiServiceStart,
      notifications: getNotifications(),
      share: getShare(),
      uiSettings: getUiSettings(),
      settings: getSettings(),
      theme: {
        theme$: EMPTY,
        getTheme: () => ({ darkMode: false, name: 'borealis' }),
      },
      pricing: {} as unknown as PricingServiceStart,
      security: {} as unknown as SecurityServiceStart,
      userProfile: {} as unknown as UserProfileServiceStart,
      plugins: {} as unknown as PluginsServiceStart,
      authz: {
        fleet: {
          all: true,
          setup: true,
          readEnrollmentTokens: true,

          // subfeatures
          allAgents: true,
          readAgents: true,
          allSettings: true,
          readSettings: true,
          readAgentPolicies: true,
          allAgentPolicies: true,
          addAgents: true,
          addFleetServers: true,
          generateAgentReports: true,
        },
        integrations: {
          all: true,
          readPackageInfo: true,
          readInstalledPackages: true,
          installPackages: true,
          upgradePackages: true,
          uploadPackages: true,
          removePackages: true,
          readPackageSettings: true,
          writePackageSettings: true,
          readIntegrationPolicies: true,
          writeIntegrationPolicies: true,
        },
      },
    }),
    [isCloudEnabled]
  );
  useEffect(() => {
    setHttpClient(startServices.http);
    setCustomIntegrations({
      getAppendCustomIntegrations: async () => [],
      getReplacementCustomIntegrations: async () => {
        const { integrations } = await import('./fixtures/replacement_integrations');
        return integrations;
      },
    });
  }, [startServices]);

  const config = {
    enabled: true,
    agents: {
      enabled: true,
      elasticsearch: {},
    },
  } as unknown as FleetConfigType;

  const extensions = {};
  const theme$ = EMPTY;
  const kibanaVersion = '1.2.3';
  const setHeaderActionMenu = useCallback(() => {}, []);

  return (
    <IntegrationsAppContext
      {...{
        kibanaVersion,
        basepath,
        config,
        history,
        startServices,
        extensions,
        setHeaderActionMenu,
        theme$,
      }}
    >
      {storyChildren}
    </IntegrationsAppContext>
  );
};
