/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { type AppMountParameters, type CoreStart } from '@kbn/core/public';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { QueryClientProvider } from '@kbn/react-query';
import { SignificantEventsAppContextProvider } from './app_context_provider';
import { significantEventsAppRouter } from '../routes/config';
import { significantEventsQueryClient } from '../query_client';
import type { SignificantEventsAppStartDependencies } from '../types';
import type { SignificantEventsAppServices } from '../services/types';
import { DateRangeRedirect } from './date_range_redirect';
import { UpdateExecutionContextOnRouteChange } from './update_execution_context_on_route_change';

export function AppRoot({
  coreStart,
  pluginsStart,
  services,
  appMountParameters,
}: {
  coreStart: CoreStart;
  pluginsStart: SignificantEventsAppStartDependencies;
  services: SignificantEventsAppServices;
  appMountParameters: AppMountParameters;
}) {
  const { history } = appMountParameters;

  const context = useMemo(
    () => ({
      core: coreStart,
      dependencies: {
        start: pluginsStart,
      },
      services,
    }),
    [coreStart, pluginsStart, services]
  );

  return (
    <SignificantEventsAppContextProvider context={context}>
      <QueryClientProvider client={significantEventsQueryClient}>
        {/* @ts-expect-error upgrade typescript v5.4.5 */}
        <RouterProvider history={history} router={significantEventsAppRouter}>
          <UpdateExecutionContextOnRouteChange>
            <DateRangeRedirect>
              <PerformanceContextProvider>
                <RouteRenderer />
              </PerformanceContextProvider>
            </DateRangeRedirect>
          </UpdateExecutionContextOnRouteChange>
        </RouterProvider>
      </QueryClientProvider>
    </SignificantEventsAppContextProvider>
  );
}
