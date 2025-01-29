/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import { EuiSkeletonText } from '@elastic/eui';

import { INTEGRATIONS_ROUTING_PATHS } from '../../constants';
import { IntegrationsStateContextProvider, useBreadcrumbs, useStartServices } from '../../hooks';

import { EPMHomePage } from './screens/home';
import { Detail } from './screens/detail';
import { Policy } from './screens/policy';
import { CreateIntegration } from './screens/create';
import { CustomLanguagesOverview } from './screens/detail/custom_languages_overview';

export const EPMApp: React.FunctionComponent = () => {
  const { automaticImport } = useStartServices();
  useBreadcrumbs('integrations');

  return (
    <Routes>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integration_policy_edit}>
        <Policy />
      </Route>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details}>
        <IntegrationsStateContextProvider>
          <Detail />
        </IntegrationsStateContextProvider>
      </Route>
      <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_language_clients}>
        <IntegrationsStateContextProvider>
          <React.Suspense fallback={<EuiSkeletonText />}>
            <CustomLanguagesOverview />
          </React.Suspense>
        </IntegrationsStateContextProvider>
      </Route>
      {automaticImport && (
        <Route path={INTEGRATIONS_ROUTING_PATHS.integrations_create}>
          <CreateIntegration />
        </Route>
      )}
      <Route path={INTEGRATIONS_ROUTING_PATHS.integrations}>
        <EPMHomePage />
      </Route>
    </Routes>
  );
};
