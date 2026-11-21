/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import type { History } from 'history';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import type { CasesPublicStartDependencies } from '../types';
import { DetailPage } from './components/detail/detail_page';
import { QueuePage } from './components/queue/queue_page';

export interface InvestigationsAppProps {
  coreStart: CoreStart;
  pluginsStart: CasesPublicStartDependencies;
  history: History;
}

const rootStyles = css`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
`;

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { networkMode: 'always', refetchOnWindowFocus: false },
      mutations: { networkMode: 'always' },
    },
  });

/** Providers and routes of the Investigations app. */
export const InvestigationsApp: React.FC<InvestigationsAppProps> = ({
  coreStart,
  pluginsStart,
  history,
}) => {
  const queryClient = useMemo(createQueryClient, []);
  // Core services win over plugin contracts that share a name, such as `security`.
  const services = useMemo(() => ({ ...pluginsStart, ...coreStart }), [coreStart, pluginsStart]);

  return (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <div css={rootStyles} data-test-subj="investigationsApp">
            <Routes>
              <Route exact path="/" component={QueuePage} />
              <Route exact path="/:id" component={DetailPage} />
              <Route path="*">
                <Redirect to="/" />
              </Route>
            </Routes>
          </div>
        </Router>
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};
InvestigationsApp.displayName = 'InvestigationsApp';
