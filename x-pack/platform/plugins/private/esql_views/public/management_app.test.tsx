/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { EsqlViewsClient } from '@kbn/esql-utils';
import { getQueryPreview } from './esql_views_table';
import { ManagementApp } from './management_app';

const documentationUrl = 'https://www.elastic.co/docs/reference/query-languages/esql/esql-views';

const createClientError = (message: string, statusCode: number) =>
  Object.assign(new Error(message), { statusCode });

const createClient = (): jest.Mocked<EsqlViewsClient> => ({
  getViews: jest.fn(),
  getView: jest.fn(),
  createView: jest.fn(),
  updateView: jest.fn(),
  deleteViews: jest.fn(),
});

const renderApp = (client: EsqlViewsClient) =>
  render(
    <EuiProvider>
      <MockAppHeaderProvider>
        <ManagementApp client={client} documentationUrl={documentationUrl} />
      </MockAppHeaderProvider>
    </EuiProvider>
  );

describe('ManagementApp', () => {
  it('normalizes and bounds query previews', () => {
    const preview = getQueryPreview(`FROM logs-*\n| KEEP ${'x'.repeat(250)}`);

    expect(preview).toHaveLength(201);
    expect(preview.startsWith('FROM logs-* | KEEP ')).toBe(true);
    expect(preview.endsWith('…')).toBe(true);
  });

  it('loads and displays API-backed views', async () => {
    const client = createClient();
    client.getViews.mockResolvedValue({
      views: [
        {
          name: 'logs-view',
          description: 'Production logs',
          query: 'FROM logs-* | LIMIT 100',
        },
      ],
    });

    renderApp(client);

    expect(screen.getByTestId('esqlViewsLoading')).toBeInTheDocument();
    expect(await screen.findByText('logs-view')).toBeInTheDocument();
    expect(screen.getByText('Production logs')).toBeInTheDocument();
    expect(screen.getByText('FROM logs-* | LIMIT 100')).toBeInTheDocument();
    expect(
      screen.getByText('Define named, reusable queries and reference them like an index.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Learn more/ })).toHaveAttribute(
      'href',
      documentationUrl
    );
    expect(screen.getByPlaceholderText('Search views')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(client.getViews).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('shows the full query in a popover when the preview is clicked', async () => {
    const client = createClient();
    const query = `FROM logs-* | EVAL message = "${'x'.repeat(250)}" | KEEP full_query_end`;
    client.getViews.mockResolvedValue({
      views: [{ name: 'long-query-view', query }],
    });

    renderApp(client);

    const queryCell = await screen.findByTestId('esqlViewsQueryCell');
    expect(queryCell).not.toHaveTextContent('full_query_end');
    expect(screen.queryByTestId('esqlViewsQueryPopover')).not.toBeInTheDocument();

    fireEvent.click(queryCell);

    expect(await screen.findByTestId('esqlViewsQueryPopover')).toHaveTextContent('full_query_end');
  });

  it('searches names, descriptions, and queries', async () => {
    const client = createClient();
    client.getViews.mockResolvedValue({
      views: [
        {
          name: 'logs-view',
          description: 'Production logs',
          query: 'FROM logs-*',
        },
        {
          name: 'orders-view',
          description: 'Customer orders',
          query: 'FROM orders-*',
        },
      ],
    });

    renderApp(client);
    await screen.findByText('logs-view');

    fireEvent.change(screen.getByTestId('esqlViewsSearch'), {
      target: { value: 'orders' },
    });

    await waitFor(() => {
      expect(screen.queryByText('logs-view')).not.toBeInTheDocument();
    });
    expect(screen.getByText('orders-view')).toBeInTheDocument();
  });

  it('paginates the complete client-side result', async () => {
    const client = createClient();
    client.getViews.mockResolvedValue({
      views: Array.from({ length: 11 }, (_, index) => ({
        name: `view-${String(index).padStart(2, '0')}`,
        query: `ROW value = ${index}`,
      })),
    });

    renderApp(client);

    expect(await screen.findByText('view-00')).toBeInTheDocument();
    expect(screen.queryByText('view-10')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Next page'));

    expect(await screen.findByText('view-10')).toBeInTheDocument();
    expect(screen.queryByText('view-00')).not.toBeInTheDocument();
  });

  it('displays empty and unsupported states', async () => {
    const emptyClient = createClient();
    emptyClient.getViews.mockResolvedValue({ views: [] });

    const { unmount } = renderApp(emptyClient);
    expect(await screen.findByText('No ES|QL views found')).toBeInTheDocument();
    unmount();

    const unsupportedClient = createClient();
    unsupportedClient.getViews.mockRejectedValue(createClientError('No handler found', 404));

    renderApp(unsupportedClient);
    expect(await screen.findByTestId('esqlViewsUnsupported')).toBeInTheDocument();
  });

  it('retries errors and reloads the table', async () => {
    const client = createClient();
    client.getViews
      .mockRejectedValueOnce(createClientError('Request failed', 500))
      .mockResolvedValueOnce({
        views: [{ name: 'first-view', query: 'ROW value = 1' }],
      })
      .mockResolvedValueOnce({
        views: [{ name: 'second-view', query: 'ROW value = 2' }],
      });

    renderApp(client);

    expect(await screen.findByTestId('esqlViewsError')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('esqlViewsRetryButton'));
    expect(await screen.findByText('first-view')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('esqlViewsReloadButton'));
    expect(await screen.findByText('second-view')).toBeInTheDocument();
    expect(screen.queryByText('first-view')).not.toBeInTheDocument();
    expect(client.getViews).toHaveBeenCalledTimes(3);
  });
});
