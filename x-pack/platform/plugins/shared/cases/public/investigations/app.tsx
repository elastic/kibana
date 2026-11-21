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
import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { canUseCases } from '../client/helpers/can_use_cases';
import type { UnifiedAttachmentTypeRegistry } from '../client/attachment_framework/unified_attachment_registry';
import { CasesProvider } from '../components/cases_context';
import type { CasesPublicStartDependencies } from '../types';
import { DetailPage } from './components/detail/detail_page';
import { QueuePage } from './components/queue/queue_page';
import { SettingsPage } from './components/settings/settings_page';

export interface InvestigationsAppProps {
  coreStart: CoreStart;
  pluginsStart: CasesPublicStartDependencies;
  history: History;
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
  getFilesClient: (scope: string) => ScopedFilesClient;
}

const CASES_OWNERS = [SECURITY_SOLUTION_OWNER];

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
  unifiedAttachmentTypeRegistry,
  getFilesClient,
}) => {
  const queryClient = useMemo(createQueryClient, []);
  // The plugin `security` contract (with `userProfiles`, needed by the Cases user picker) replaces
  // the core `security` service, which only has `authc` and `serviceAccounts`.
  const services = useMemo(
    () => ({ ...pluginsStart, ...coreStart, security: pluginsStart.security }),
    [coreStart, pluginsStart]
  );
  const permissions = useMemo(
    () => canUseCases(coreStart.application.capabilities)(CASES_OWNERS),
    [coreStart.application.capabilities]
  );
  const casesContextValue = useMemo(
    () => ({
      owner: CASES_OWNERS,
      permissions,
      unifiedAttachmentTypeRegistry,
      getFilesClient,
    }),
    [permissions, unifiedAttachmentTypeRegistry, getFilesClient]
  );

  return (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>
        {/* Shares the app's query client, so every hook of the app and of Cases uses one cache. */}
        <CasesProvider value={casesContextValue} queryClient={queryClient}>
          <Router history={history}>
            <div css={rootStyles} data-test-subj="investigationsApp">
              <Routes>
                <Route exact path="/" component={QueuePage} />
                <Route exact path="/settings" component={SettingsPage} />
                <Route exact path="/:id" component={DetailPage} />
                <Route path="*">
                  <Redirect to="/" />
                </Route>
              </Routes>
            </div>
          </Router>
        </CasesProvider>
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};
InvestigationsApp.displayName = 'InvestigationsApp';
