/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { KiRow } from './ki_row';

const ki: KiListItem = {
  id: 'ki-1',
  index: 'ai-index-idx-sample-ki',
  type: 'playbook',
  title: 'Verify the order, check the SLA window, then issue store credit.',
};

const renderKiRow = (httpGet: jest.Mock = jest.fn()) => {
  const services = coreMock.createStart();
  services.http.get = httpGet;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>
            <KiRow aiIndexId="sample-ki" ki={ki} />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('KiRow', () => {
  it('renders the title and type without fetching', () => {
    const httpGet = jest.fn();
    renderKiRow(httpGet);

    expect(screen.getByTestId('contextKiRowTitle')).toHaveTextContent(
      'Verify the order, check the SLA window, then issue store credit.'
    );
    expect(screen.getByTestId('contextKiRowType')).toHaveTextContent('Playbook');
    expect(httpGet).not.toHaveBeenCalled();
    expect(screen.queryByTestId('contextKiRowJson')).not.toBeInTheDocument();
  });

  it('renders None when type or title is missing', () => {
    const httpGet = jest.fn();
    const services = coreMock.createStart();
    services.http.get = httpGet;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={services}>
            <QueryClientProvider client={queryClient}>
              <KiRow aiIndexId="sample-ki" ki={{ id: 'ki-1', index: 'ai-index-idx-sample-ki' }} />
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextKiRowTitle')).toHaveTextContent('None');
    expect(screen.getByTestId('contextKiRowType')).toHaveTextContent('None');
  });

  it('fetches and renders the KI JSON when expanded', async () => {
    const httpGet = jest.fn().mockResolvedValue({
      id: 'ki-1',
      document: {
        type: 'playbook',
        title: 'Verify the order, check the SLA window, then issue store credit.',
        content: 'Verify the order first.',
      },
    });
    renderKiRow(httpGet);

    fireEvent.click(screen.getByTestId('contextKiRowToggle'));

    await waitFor(() => {
      expect(screen.getByTestId('contextKiRowJson')).toHaveTextContent('"id": "ki-1"');
    });
    expect(screen.getByTestId('contextKiRowJson')).toHaveTextContent(
      '"content": "Verify the order first."'
    );
    expect(httpGet).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/sample-ki/kis/ki-1',
      expect.objectContaining({
        version: '1',
        query: { index: 'ai-index-idx-sample-ki' },
      })
    );
  });

  it('shows an error when the KI document cannot be loaded', async () => {
    const httpGet = jest.fn().mockRejectedValue(new Error('boom'));
    renderKiRow(httpGet);

    fireEvent.click(screen.getByTestId('contextKiRowToggle'));

    await waitFor(() => {
      expect(screen.getByTestId('contextKiRowJsonError')).toHaveTextContent(
        'Unable to load Knowledge Indicator. boom'
      );
    });
  });
});
