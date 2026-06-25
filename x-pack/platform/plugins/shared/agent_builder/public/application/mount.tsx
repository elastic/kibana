/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { AgentBuilderRoutes } from './routes';
import type { AgentBuilderInternalService } from '../services';
import type { AgentBuilderStartDependencies } from '../types';
import { AgentBuilderServicesContext } from './context/agent_builder_services_context';
import { ActiveSpaceSync } from './context/active_space_sync';
import { PageWrapper } from './page_wrapper';
import { AppLeaveContext, type OnAppLeave } from './context/app_leave_context';
import { StreamingProvider } from './context/streaming/streaming_context';
import { AgentWorkspaceLinkInterceptor } from './context/agent_workspace_link_interceptor';
import { AgentWorkspaceDocTitle } from '../agent_workspace/agent_workspace_doc_title';
import {
  createAgentWorkspaceFlyoutDefaults,
  resolveAgentWorkspaceFlyoutContainer,
} from '../agent_workspace/agent_workspace_flyout_defaults';
import { EuiComponentDefaultsProvider } from '@elastic/eui';

export const mountApp = async ({
  core,
  plugins,
  element,
  history,
  services,
  onAppLeave,
  isAgentWorkspaceMount = false,
}: {
  core: CoreStart;
  plugins: AgentBuilderStartDependencies;
  element: HTMLElement;
  history: ScopedHistory;
  services: AgentBuilderInternalService;
  onAppLeave: OnAppLeave;
  isAgentWorkspaceMount?: boolean;
}) => {
  const ApplicationUsageTrackingProvider =
    services.usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  const kibanaServices = {
    ...core,
    plugins,
    appParams: { history, isAgentWorkspaceMount },
  };
  const queryClient = new QueryClient();
  await services.accessChecker.initAccess();

  const appContent = (
    <KibanaContextProvider services={kibanaServices}>
      <ApplicationUsageTrackingProvider>
        <I18nProvider>
          <ActiveSpaceSync spaces={plugins.spaces} queryClient={queryClient}>
            <AgentBuilderServicesContext.Provider value={services}>
              <AppLeaveContext.Provider value={onAppLeave}>
                <RedirectAppLinks coreStart={core}>
                  <PageWrapper>
                    {isAgentWorkspaceMount ? (
                      <>
                        <AgentWorkspaceDocTitle />
                        <Router history={history}>
                          <StreamingProvider>
                            <AgentWorkspaceLinkInterceptor history={history}>
                              <AgentBuilderRoutes />
                            </AgentWorkspaceLinkInterceptor>
                          </StreamingProvider>
                        </Router>
                      </>
                    ) : (
                      <Router history={history}>
                        <StreamingProvider>
                          <AgentBuilderRoutes />
                        </StreamingProvider>
                      </Router>
                    )}
                  </PageWrapper>
                </RedirectAppLinks>
              </AppLeaveContext.Provider>
            </AgentBuilderServicesContext.Provider>
          </ActiveSpaceSync>
        </I18nProvider>
      </ApplicationUsageTrackingProvider>
    </KibanaContextProvider>
  );

  const agentWorkspaceFlyoutDefaults = isAgentWorkspaceMount
    ? createAgentWorkspaceFlyoutDefaults(resolveAgentWorkspaceFlyoutContainer(element))
    : undefined;

  const appTree = agentWorkspaceFlyoutDefaults
    ? (
        <EuiComponentDefaultsProvider componentDefaults={agentWorkspaceFlyoutDefaults}>
          {appContent}
        </EuiComponentDefaultsProvider>
      )
    : appContent;

  ReactDOM.render(core.rendering.addContext(appTree), element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
