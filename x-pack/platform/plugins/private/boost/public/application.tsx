/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { BoostPage } from './components/boost_page';
import { ProfileDetailsPage } from './components/profiles/profile_details_page';
import { RuleDetailsPage } from './components/rules/rule_details_page';
import type { BoostServices } from './types';

interface BoostAppProps {
  core: CoreStart;
  params: ManagementAppMountParams;
}

const BoostApp = ({ core, params }: BoostAppProps) => {
  const services = useMemo<BoostServices>(() => ({ ...core, appParams: params }), [core, params]);
  const queryClient = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }),
    []
  );

  return (
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>
          <Router history={params.history}>
            <Routes>
              <Route path="/rules/:ruleName" component={RuleDetailsPage} />
              <Route path="/profiles/:profileName" component={ProfileDetailsPage} />
              <Route path="/:tab?" component={BoostPage} />
            </Routes>
          </Router>
        </QueryClientProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};

export const renderApp = (core: CoreStart, params: ManagementAppMountParams) => {
  ReactDOM.render(<BoostApp core={core} params={params} />, params.element);

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
