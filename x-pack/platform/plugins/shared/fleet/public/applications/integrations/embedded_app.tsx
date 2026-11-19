/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { History } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { ConfigContext, KibanaVersionContext } from '../../hooks';
import { EmbeddedContextProvider } from '../../hooks/use_embedded_context';
import { FleetStatusProvider } from '../../hooks/use_fleet_status';
import { SpaceSettingsContextProvider } from '../../hooks/use_space_settings_context';
import { getFleetAppServices } from '../../services/start_services';

import { AgentPolicyContextProvider } from './hooks';
import { PackageInstallProvider, UIExtensionsContext, FlyoutContextProvider } from './hooks';
import { ReadOnlyContextProvider } from './hooks/use_read_only_context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'always' },
    mutations: { networkMode: 'always' },
  },
});

const EmptyContext = () => <></>;

export interface EmbeddedIntegrationsProviderProps {
  /**
   * The router history the embedded pages navigate on. Hosts pass a memory history so that
   * navigation inside the embedding surface never touches the browser URL.
   */
  history: History<any>;
  /**
   * Called where an embedded page would otherwise navigate out of Integrations: Cancel, and the
   * redirect after a package policy is saved.
   */
  onClose?: () => void;
  children: React.ReactNode;
}

/**
 * Everything `IntegrationsAppContext` provides, minus the pieces that only make sense when
 * Integrations owns the page: the app header, the Fleet server flyout, and the permission layout.
 *
 * Fleet assembles this itself because `FleetStartServices` is core plus all of Fleet's start
 * dependencies — a host plugin would have to declare every one of them to build it.
 */
export const EmbeddedIntegrationsProvider: React.FC<EmbeddedIntegrationsProviderProps> = memo(
  ({ history, onClose, children }) => {
    const { startServices, config, kibanaVersion, extensions } = getFleetAppServices();
    const isDarkMode = useObservable(
      startServices.theme.theme$,
      startServices.theme.getTheme()
    ).darkMode;
    const CloudContext = startServices.cloud?.CloudContextProvider || EmptyContext;

    return (
      <KibanaContextProvider services={{ ...startServices }}>
        <ConfigContext.Provider value={config}>
          <KibanaVersionContext.Provider value={kibanaVersion}>
            <EuiThemeProvider darkMode={isDarkMode}>
              <QueryClientProvider client={queryClient}>
                <UIExtensionsContext.Provider value={extensions}>
                  <FleetStatusProvider>
                    <SpaceSettingsContextProvider>
                      <startServices.customIntegrations.ContextProvider>
                        <CloudContext>
                          <EmbeddedContextProvider onClose={onClose}>
                            <Router history={history}>
                              <ReadOnlyContextProvider>
                                <AgentPolicyContextProvider>
                                  <PackageInstallProvider startServices={startServices}>
                                    <FlyoutContextProvider>{children}</FlyoutContextProvider>
                                  </PackageInstallProvider>
                                </AgentPolicyContextProvider>
                              </ReadOnlyContextProvider>
                            </Router>
                          </EmbeddedContextProvider>
                        </CloudContext>
                      </startServices.customIntegrations.ContextProvider>
                    </SpaceSettingsContextProvider>
                  </FleetStatusProvider>
                </UIExtensionsContext.Provider>
              </QueryClientProvider>
            </EuiThemeProvider>
          </KibanaVersionContext.Provider>
        </ConfigContext.Provider>
      </KibanaContextProvider>
    );
  }
);
EmbeddedIntegrationsProvider.displayName = 'EmbeddedIntegrationsProvider';
