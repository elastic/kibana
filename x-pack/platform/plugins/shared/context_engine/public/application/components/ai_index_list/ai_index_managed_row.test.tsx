/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { createAppChromeMock } from '../../test_utils/app_chrome_mock';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { AiIndexManagedRow } from './ai_index_managed_row';

const buildManagedAiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem => ({
  id: 'elastic',
  managed: true,
  description:
    'Kibana resources available for use in Agent Builder, including dashboards, visualizations, connectors, workflows, alerting rules, action policies, and significant events.',
  dest: { type: 'index', value: 'ai-index-idx-sml-data' },
  automations: [],
  sources: [],
  date_created: '2026-07-17T00:00:00.000Z',
  date_modified: '2026-07-17T00:00:00.000Z',
  ...overrides,
});

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderWithProviders = (core: CoreStart, aiIndex: AiIndexHttpItem) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider
          services={{
            ...core,
            history: scopedHistoryMock.create(),
            appChrome: createAppChromeMock(),
          }}
        >
          <QueryClientProvider client={createTestQueryClient()}>
            <AiIndexManagedRow aiIndex={aiIndex} />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

describe('AiIndexManagedRow', () => {
  it('renders managed row metadata, a one-line description, and the knowledge indicator count', async () => {
    const core = coreMock.createStart();
    core.http.get.mockResolvedValue({
      kis: [],
      total: 9,
      summary: { total: 9, counts_by_type: [] },
    });

    renderWithProviders(core, buildManagedAiIndex());

    expect(screen.getByTestId('contextAiIndexManagedRowTitle')).toHaveTextContent('elastic');
    expect(screen.getByTestId('contextAiIndexManagedRowManaged')).toHaveTextContent('Managed');
    expect(screen.getByTestId('contextAiIndexManagedRowIntegratedVia')).toHaveTextContent(
      'Elastic (built-in)'
    );
    expect(screen.getByTestId('contextAiIndexManagedRowActions')).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexManagedRowKnowledgeIndicators')).toHaveTextContent(
        '9'
      )
    );
  });

  it('navigates to the detail page when the row is clicked', async () => {
    const core = coreMock.createStart();
    core.http.get.mockResolvedValue({
      kis: [],
      total: 0,
      summary: { total: 0, counts_by_type: [] },
    });

    renderWithProviders(core, buildManagedAiIndex());

    fireEvent.click(screen.getByTestId('contextAiIndexManagedRow'));

    expect(core.application.navigateToApp).toHaveBeenCalledWith('context_engine', {
      path: '/ai_index/elastic',
    });
  });
});
