/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { Redirect } from 'react-router-dom';

import { Router, Routes, Route } from '@kbn/shared-ux-router';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';
import { ScopedHistory } from '@kbn/core/public';

import { API_BASE_PATH } from '../../common/constants';
import { ClusterUpgradeState } from '../../common/types';
import {
  APP_WRAPPER_CLASS,
  GlobalFlyout,
  AuthorizationProvider,
  RedirectAppLinks,
  KibanaRenderContextProvider,
  NotAuthorizedSection,
} from '../shared_imports';
import { AppDependencies } from '../types';
import { AppContextProvider, useAppContext } from './app_context';
import { EsDeprecations, EsDeprecationLogs, KibanaDeprecations, Overview } from './components';

const { GlobalFlyoutProvider } = GlobalFlyout;

const AppHandlingClusterUpgradeState: React.FunctionComponent = () => {
  const {
    services: { api, core },
  } = useAppContext();

  const missingManageSpacesPrivilege = core.application.capabilities.spaces.manage !== true;

  const [clusterUpgradeState, setClusterUpgradeState] =
    useState<ClusterUpgradeState>('isPreparingForUpgrade');

  useEffect(() => {
    api.onClusterUpgradeStateChange((newClusterUpgradeState: ClusterUpgradeState) => {
      setClusterUpgradeState(newClusterUpgradeState);
    });
  }, [api]);

  if (missingManageSpacesPrivilege) {
    return (
      <NotAuthorizedSection
        dataTestSubj="missingKibanaPrivilegesMessage"
        title={
          <FormattedMessage
            id="xpack.upgradeAssistant.app.deniedPrivilegeTitle"
            defaultMessage="Kibana admin role required"
          />
        }
        message={
          <FormattedMessage
            id="xpack.upgradeAssistant.app.deniedPrivilegeDescription"
            defaultMessage="To use Upgrade Assistant and resolve deprecation issues, you must have access to manage all Kibana spaces."
          />
        }
      />
    );
  }

  if (clusterUpgradeState === 'isUpgrading') {
    return (
      <EuiPageTemplate.EmptyPrompt
        iconType="logoElasticsearch"
        title={
          <h1>
            <FormattedMessage
              id="xpack.upgradeAssistant.upgradingTitle"
              defaultMessage="Your cluster is upgrading"
            />
          </h1>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.upgradingDescription"
              defaultMessage="One or more Elasticsearch nodes have a newer version of
                Elasticsearch than Kibana. Once all your nodes are upgraded, upgrade Kibana."
            />
          </p>
        }
        data-test-subj="isUpgradingMessage"
      />
    );
  }

  if (clusterUpgradeState === 'isUpgradeComplete') {
    return (
      <EuiPageTemplate.EmptyPrompt
        iconType="logoElasticsearch"
        title={
          <h1>
            <FormattedMessage
              id="xpack.upgradeAssistant.upgradedTitle"
              defaultMessage="Your cluster has been upgraded"
            />
          </h1>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.upgradedDescription"
              defaultMessage="All Elasticsearch nodes have been upgraded. You may now upgrade Kibana."
            />
          </p>
        }
        data-test-subj="isUpgradeCompleteMessage"
      />
    );
  }

  return (
    <Routes>
      <Route exact path="/overview" component={Overview} />
      <Route exact path="/es_deprecations" component={EsDeprecations} />
      <Route exact path="/es_deprecation_logs" component={EsDeprecationLogs} />
      <Route exact path="/kibana_deprecations" component={KibanaDeprecations} />
      <Redirect from="/" to="/overview" />
    </Routes>
  );
};

export const App = ({ history }: { history: ScopedHistory }) => {
  const {
    services: { api },
  } = useAppContext();

  // Poll the API to detect when the cluster is either in the middle of
  // a rolling upgrade or has completed one. We need to create two separate
  // components: one to call this hook and one to handle state changes.
  // This is because the implementation of this hook calls the state-change
  // callbacks on every render, which will get the UI stuck in an infinite
  // render loop if the same component both called the hook and handled
  // the state changes it triggers.
  const { isLoading, isInitialRequest } = api.useLoadClusterUpgradeStatus();

  // Prevent flicker of the underlying UI while we wait for the status to fetch.
  if (isLoading && isInitialRequest) {
    return <EuiPageTemplate.EmptyPrompt body={<EuiLoadingSpinner size="l" />} />;
  }

  return (
    <Router history={history}>
      <AppHandlingClusterUpgradeState />
    </Router>
  );
};

export const RootComponent = (dependencies: AppDependencies) => {
  const {
    history,
    core: { application, http, executionContext, ...startServices },
  } = dependencies.services;

  executionContext.set({ type: 'application', page: 'upgradeAssistant' });

  return (
    <KibanaRenderContextProvider {...startServices}>
      <div className={APP_WRAPPER_CLASS}>
        <RedirectAppLinks
          coreStart={{
            application,
          }}
        >
          <AuthorizationProvider
            httpClient={http}
            privilegesEndpoint={`${API_BASE_PATH}/privileges`}
          >
            <AppContextProvider value={dependencies}>
              <GlobalFlyoutProvider>
                <App history={history} />
              </GlobalFlyoutProvider>
            </AppContextProvider>
          </AuthorizationProvider>
        </RedirectAppLinks>
      </div>
    </KibanaRenderContextProvider>
  );
};
