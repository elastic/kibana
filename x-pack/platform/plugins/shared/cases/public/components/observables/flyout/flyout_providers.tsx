/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import type { History } from 'history';
import { useHistory } from 'react-router-dom';
import { Router } from '@kbn/shared-ux-router';
import type { QueryClient } from '@kbn/react-query';
import { QueryClientProvider, useQueryClient } from '@kbn/react-query';
import { KibanaContextProvider, useKibana } from '../../../common/lib/kibana';
import type { StartServices } from '../../../types';
import type { CasesContextValue } from '../../cases_context';
import { CasesContext } from '../../cases_context';
import { useCasesContext } from '../../cases_context/use_cases_context';
import type { CasesContextState } from '../../cases_context/state/cases_context_reducer';
import {
  CasesStateContext,
  useCasesStateContext,
} from '../../cases_context/state/cases_state_context';

/** What a flyout needs from the tree that opens it, since it renders in its own React root. */
export interface ObservableFlyoutContext {
  services: StartServices;
  casesContext: CasesContextValue;
  casesState: CasesContextState;
  queryClient: QueryClient;
  history: History;
}

/** Reads the opener's context, to hand to {@link ObservableFlyoutProviders} at open time. */
export const useObservableFlyoutContext = (): ObservableFlyoutContext => {
  const { services } = useKibana();
  const casesContext = useCasesContext();
  const casesState = useCasesStateContext();
  const queryClient = useQueryClient();
  const history = useHistory();

  return useMemo(
    () => ({ services, casesContext, casesState, queryClient, history }),
    [services, casesContext, casesState, queryClient, history]
  );
};

/**
 * Re-establishes the opener's Kibana services, router, query cache and Cases context inside a
 * flyout. The query client is the opener's, so the flyout shares its cache.
 */
export const ObservableFlyoutProviders = ({
  context: { services, casesContext, casesState, queryClient, history },
  children,
}: PropsWithChildren<{ context: ObservableFlyoutContext }>) => (
  <KibanaContextProvider services={services}>
    <Router history={history}>
      <QueryClientProvider client={queryClient}>
        <CasesStateContext.Provider value={casesState}>
          <CasesContext.Provider value={casesContext}>{children}</CasesContext.Provider>
        </CasesStateContext.Provider>
      </QueryClientProvider>
    </Router>
  </KibanaContextProvider>
);

ObservableFlyoutProviders.displayName = 'ObservableFlyoutProviders';
