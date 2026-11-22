/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ScopedHistory } from '@kbn/core/public';
import { EVALS_UI_PRIVILEGES, PLUGIN_ID } from '../common';
import { EvalsApp } from './application';

jest.mock('./pages/experiments_list', () => ({
  ExperimentsListPage: () => <div>Experiments list</div>,
}));
jest.mock('./pages/online_evals_list', () => ({
  OnlineEvalsListPage: () => <div>Online evals list</div>,
}));

describe('EvalsApp', () => {
  it('keeps the online evaluations route available without showing a navigation tab', () => {
    const history = createMemoryHistory({
      initialEntries: ['/online'],
    }) as unknown as ScopedHistory;

    render(
      <EvalsApp
        history={history}
        setBreadcrumbs={jest.fn()}
        getHref={(path) => path}
        breadcrumbPrefix={[]}
      />
    );

    expect(screen.getByText('Online evals list')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Online Evaluations' })).not.toBeInTheDocument();
  });

  describe('review entry points', () => {
    const http = { get: jest.fn(), post: jest.fn() };

    const renderAt = (path: string, capabilities: Record<string, boolean>) => {
      const history = createMemoryHistory({ initialEntries: [path] }) as unknown as ScopedHistory;
      const queryClient = new QueryClient({
        logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
      });

      return render(
        <KibanaContextProvider
          services={{ http, application: { capabilities: { [PLUGIN_ID]: capabilities } } }}
        >
          <QueryClientProvider client={queryClient}>
            <EvalsApp
              history={history}
              setBreadcrumbs={jest.fn()}
              getHref={(p) => p}
              breadcrumbPrefix={[]}
            />
          </QueryClientProvider>
        </KibanaContextProvider>
      );
    };

    beforeEach(() => {
      jest.clearAllMocks();
      http.get.mockRejectedValue(new Error('review routes answer 403 without the privilege'));
    });

    it('offers the Review tab to users who can review', () => {
      renderAt('/', { [EVALS_UI_PRIVILEGES.show]: true, [EVALS_UI_PRIVILEGES.review]: true });

      expect(screen.getByRole('tab', { name: 'Review' })).toBeInTheDocument();
    });

    it('hides the Review tab from read-only users', () => {
      renderAt('/', { [EVALS_UI_PRIVILEGES.show]: true });

      expect(screen.queryByRole('tab', { name: 'Review' })).not.toBeInTheDocument();
    });

    it.each(['/review', '/review/queue-1'])(
      'explains the missing privilege on %s without any review request',
      async (path) => {
        renderAt(path, { [EVALS_UI_PRIVILEGES.show]: true });

        expect(await screen.findByTestId('evalsReviewNoPrivilege')).toBeInTheDocument();
        expect(screen.queryByText('Unable to load review queues')).not.toBeInTheDocument();
        expect(http.get).not.toHaveBeenCalled();
      }
    );
  });
});
