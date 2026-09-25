/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { notificationServiceMock } from '@kbn/core/public/mocks';
import type { EsqlViewsResult } from '@kbn/esql-types';
import type { EsqlViewsClient } from '@kbn/esql-utils';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { getQueryPreview } from './esql_views_table';
import { ManagementApp } from './management_app';
import type { DiscoverEsqlLocatorParams } from './types';

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

const createDiscoverLocator = () => sharePluginMock.createLocator<DiscoverEsqlLocatorParams>();

const renderApp = (
  client: EsqlViewsClient,
  {
    discoverLocator,
    toasts = notificationServiceMock.createStartContract().toasts,
  }: {
    discoverLocator?: ReturnType<typeof createDiscoverLocator>;
    toasts?: ReturnType<typeof notificationServiceMock.createStartContract>['toasts'];
  } = {}
) =>
  render(
    <EuiProvider>
      <MockAppHeaderProvider>
        <ManagementApp
          client={client}
          discoverLocator={discoverLocator}
          documentationUrl={documentationUrl}
          toasts={toasts}
        />
      </MockAppHeaderProvider>
    </EuiProvider>
  );

const twoViews: EsqlViewsResult = {
  views: [
    { name: 'logs-view', description: 'Production logs', query: 'FROM logs-*' },
    { name: 'orders-view', description: 'Customer orders', query: 'FROM orders-*' },
  ],
};

const getRow = (name: string) => {
  const cell = screen.getByText(name);
  const row = cell.closest('tr');
  if (!row) {
    throw new Error(`Row for view "${name}" not found`);
  }
  return row;
};

const openDeleteAction = async (name: string) => {
  fireEvent.click(within(getRow(name)).getByTestId('esqlViewsRowActionsButton'));
  fireEvent.click(await screen.findByTestId('esqlViewsDeleteAction'));
};

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
    expect(queryCell).toHaveAccessibleName('Show full query for long-query-view');
    expect(screen.queryByTestId('esqlViewsQueryPopover')).not.toBeInTheDocument();

    fireEvent.click(queryCell);

    expect(await screen.findByTestId('esqlViewsQueryPopover')).toHaveTextContent('full_query_end');
    expect(screen.getByLabelText('Full ES|QL query')).toBeInTheDocument();
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
          name: 'sales-view',
          description: 'Customer purchases',
          query: 'FROM transactions-*',
        },
      ],
    });

    renderApp(client);
    await screen.findByText('logs-view');

    const searchInput = screen.getByTestId('esqlViewsSearch');
    for (const searchTerm of ['sales', 'purchases', 'transactions']) {
      fireEvent.change(searchInput, { target: { value: searchTerm } });

      await waitFor(() => expect(screen.queryByText('logs-view')).not.toBeInTheDocument());
      expect(screen.getByText('sales-view')).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: '' } });
      await screen.findByText('logs-view');
    }
  });

  it('distinguishes an empty search result from an empty views list', async () => {
    const client = createClient();
    client.getViews.mockResolvedValue({
      views: [{ name: 'logs-view', query: 'FROM logs-*' }],
    });

    renderApp(client);
    await screen.findByText('logs-view');

    fireEvent.change(screen.getByTestId('esqlViewsSearch'), {
      target: { value: 'missing-view' },
    });

    expect(await screen.findByTestId('esqlViewsNoSearchResults')).toHaveTextContent(
      'No views match your search'
    );
    expect(screen.queryByText('No ES|QL views found')).not.toBeInTheDocument();
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
    unsupportedClient.getViews.mockRejectedValue(
      createClientError('no handler found for uri [/_query/view] and method [GET]', 501)
    );

    renderApp(unsupportedClient);
    expect(await screen.findByTestId('esqlViewsUnsupported')).toBeInTheDocument();
  });

  it.each([401, 403])(
    'shows a non-retryable permission error for HTTP %i responses',
    async (statusCode) => {
      const client = createClient();
      client.getViews.mockRejectedValue(createClientError('Forbidden', statusCode));

      renderApp(client);

      expect(await screen.findByTestId('esqlViewsPermissionDenied')).toHaveTextContent(
        'You do not have permission to view ES|QL views. Contact your administrator.'
      );
      expect(screen.queryByTestId('esqlViewsRetryButton')).not.toBeInTheDocument();
    }
  );

  it('retries initial loading errors', async () => {
    const client = createClient();
    client.getViews
      .mockRejectedValueOnce(createClientError('Request failed', 500))
      .mockResolvedValueOnce({
        views: [{ name: 'first-view', query: 'ROW value = 1' }],
      });

    renderApp(client);

    expect(await screen.findByTestId('esqlViewsError')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('esqlViewsRetryButton'));
    expect(await screen.findByText('first-view')).toBeInTheDocument();
    expect(client.getViews).toHaveBeenCalledTimes(2);
  });

  it('fetches new views while preserving the mounted table during reload', async () => {
    const client = createClient();
    let resolveReload: ((result: EsqlViewsResult) => void) | undefined;
    const reloadRequest = new Promise<EsqlViewsResult>((resolve) => {
      resolveReload = resolve;
    });
    client.getViews
      .mockResolvedValueOnce({
        views: [{ name: 'first-view', query: 'ROW value = 1' }],
      })
      .mockReturnValueOnce(reloadRequest);

    renderApp(client);

    expect(await screen.findByText('first-view')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('esqlViewsSearch'), {
      target: { value: 'view' },
    });

    fireEvent.click(screen.getByTestId('esqlViewsReloadButton'));

    expect(client.getViews).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('esqlViewsTable')).toBeInTheDocument();
    expect(screen.getByTestId('esqlViewsSearch')).toHaveValue('view');
    expect(screen.getByTestId('esqlViewsReloadButton')).toBeDisabled();
    expect(screen.getByText('first-view')).toBeInTheDocument();

    await act(async () => {
      if (!resolveReload) {
        throw new Error('Reload request was not created');
      }
      resolveReload({
        views: [
          { name: 'first-view', query: 'ROW value = 1' },
          { name: 'new-view', query: 'ROW value = 2' },
        ],
      });
    });

    expect(await screen.findByText('new-view')).toBeInTheDocument();
    expect(screen.getByText('first-view')).toBeInTheDocument();
    expect(screen.getByTestId('esqlViewsSearch')).toHaveValue('view');
  });

  it('keeps the table mounted when a reload fails', async () => {
    const client = createClient();
    client.getViews
      .mockResolvedValueOnce({
        views: [{ name: 'first-view', query: 'ROW value = 1' }],
      })
      .mockRejectedValueOnce(createClientError('Reload failed', 500));

    renderApp(client);

    expect(await screen.findByText('first-view')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('esqlViewsReloadButton'));

    expect(await screen.findByTestId('esqlViewsReloadError')).toHaveTextContent(
      'Unable to reload ES|QL views'
    );
    expect(screen.getByTestId('esqlViewsReloadError')).toHaveTextContent('Reload failed');
    expect(screen.getByTestId('esqlViewsTable')).toBeInTheDocument();
    expect(screen.getByText('first-view')).toBeInTheDocument();
    expect(client.getViews).toHaveBeenCalledTimes(2);
  });

  it('replaces loaded views with the permission error when a reload is forbidden', async () => {
    const client = createClient();
    client.getViews
      .mockResolvedValueOnce({
        views: [{ name: 'first-view', query: 'ROW value = 1' }],
      })
      .mockRejectedValueOnce(createClientError('Forbidden', 403));

    renderApp(client);

    expect(await screen.findByText('first-view')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('esqlViewsReloadButton'));

    expect(await screen.findByTestId('esqlViewsPermissionDenied')).toBeInTheDocument();
    expect(screen.queryByTestId('esqlViewsTable')).not.toBeInTheDocument();
    expect(screen.queryByTestId('esqlViewsRetryButton')).not.toBeInTheDocument();
  });

  describe('Open in Discover', () => {
    it('navigates to Discover with a FROM query for the view', async () => {
      const client = createClient();
      client.getViews.mockResolvedValue(twoViews);
      const discoverLocator = createDiscoverLocator();

      renderApp(client, { discoverLocator });
      await screen.findByText('logs-view');

      fireEvent.click(within(getRow('logs-view')).getByTestId('esqlViewsOpenInDiscoverAction'));

      expect(discoverLocator.navigateSync).toHaveBeenCalledTimes(1);
      expect(discoverLocator.navigateSync).toHaveBeenCalledWith({
        query: { esql: 'FROM logs-view' },
      });
    });

    it('disables the action when the Discover locator is unavailable', async () => {
      const client = createClient();
      client.getViews.mockResolvedValue(twoViews);

      renderApp(client);
      await screen.findByText('logs-view');

      expect(
        within(getRow('logs-view')).getByTestId('esqlViewsOpenInDiscoverAction')
      ).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('deletion', () => {
    it('deletes a single view from its row action after confirmation', async () => {
      const client = createClient();
      client.getViews
        .mockResolvedValueOnce(twoViews)
        .mockResolvedValueOnce({ views: [twoViews.views[1]] });
      client.deleteViews.mockResolvedValue({ acknowledged: true });
      const { toasts } = notificationServiceMock.createStartContract();

      renderApp(client, { toasts });
      await screen.findByText('logs-view');

      await openDeleteAction('logs-view');

      const modal = await screen.findByTestId('esqlViewsDeleteConfirmModal');
      expect(modal).toHaveTextContent('Delete view "logs-view"?');
      expect(within(modal).getByTestId('esqlViewsDeleteDescription')).toHaveTextContent(
        'This permanently deletes the view from Elasticsearch. Any query that references this view will fail, including queries in dashboards, alerts, and other saved objects.'
      );
      expect(client.deleteViews).not.toHaveBeenCalled();

      fireEvent.click(within(modal).getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.queryByTestId('esqlViewsDeleteConfirmModal')).not.toBeInTheDocument();
      });
      expect(client.deleteViews).toHaveBeenCalledWith(['logs-view']);
      expect(toasts.addSuccess).toHaveBeenCalledWith('View "logs-view" was deleted.');
      expect(client.getViews).toHaveBeenCalledTimes(2);
      await waitFor(() => {
        expect(screen.queryByText('logs-view')).not.toBeInTheDocument();
      });
      expect(screen.getByText('orders-view')).toBeInTheDocument();
    });

    it('bulk deletes selected views', async () => {
      const client = createClient();
      client.getViews.mockResolvedValueOnce(twoViews).mockResolvedValueOnce({ views: [] });
      client.deleteViews.mockResolvedValue({ acknowledged: true });
      const { toasts } = notificationServiceMock.createStartContract();

      renderApp(client, { toasts });
      await screen.findByText('logs-view');
      expect(screen.queryByTestId('esqlViewsBulkDeleteButton')).not.toBeInTheDocument();

      fireEvent.click(within(getRow('logs-view')).getByRole('checkbox'));
      fireEvent.click(within(getRow('orders-view')).getByRole('checkbox'));

      const bulkDeleteButton = await screen.findByTestId('esqlViewsBulkDeleteButton');
      expect(bulkDeleteButton).toHaveTextContent('Delete 2 views');
      fireEvent.click(bulkDeleteButton);

      const modal = await screen.findByTestId('esqlViewsDeleteConfirmModal');
      expect(modal).toHaveTextContent('Delete 2 views?');
      expect(within(modal).getByTestId('esqlViewsDeleteDescription')).toHaveTextContent(
        'This permanently deletes 2 views from Elasticsearch. Any query that references these views will fail, including queries in dashboards, alerts, and other saved objects.'
      );

      fireEvent.click(within(modal).getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.queryByTestId('esqlViewsDeleteConfirmModal')).not.toBeInTheDocument();
      });
      expect(client.deleteViews).toHaveBeenCalledWith(['logs-view', 'orders-view']);
      expect(toasts.addSuccess).toHaveBeenCalledWith('2 views were deleted.');
      expect(await screen.findByText('No ES|QL views found')).toBeInTheDocument();
      expect(screen.queryByTestId('esqlViewsBulkDeleteButton')).not.toBeInTheDocument();
    });

    it('disables row actions while rows are selected', async () => {
      const client = createClient();
      client.getViews.mockResolvedValue(twoViews);

      renderApp(client, { discoverLocator: createDiscoverLocator() });
      await screen.findByText('logs-view');

      const otherRow = getRow('orders-view');
      expect(within(otherRow).getByTestId('esqlViewsRowActionsButton')).toHaveAttribute(
        'aria-label',
        'All actions for view "orders-view"'
      );

      fireEvent.click(within(getRow('logs-view')).getByRole('checkbox'));

      await waitFor(() => {
        expect(within(otherRow).getByTestId('esqlViewsRowActionsButton')).toHaveAttribute(
          'aria-disabled',
          'true'
        );
      });
      expect(within(otherRow).getByTestId('esqlViewsOpenInDiscoverAction')).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });

    it('clears the selection after deleting a subset of the views', async () => {
      const client = createClient();
      const thirdView = { name: 'users-view', query: 'FROM users-*' };
      client.getViews
        .mockResolvedValueOnce({ views: [...twoViews.views, thirdView] })
        .mockResolvedValueOnce({ views: [thirdView] });
      client.deleteViews.mockResolvedValue({ acknowledged: true });

      renderApp(client);
      await screen.findByText('users-view');

      fireEvent.click(within(getRow('logs-view')).getByRole('checkbox'));
      fireEvent.click(within(getRow('orders-view')).getByRole('checkbox'));
      fireEvent.click(await screen.findByTestId('esqlViewsBulkDeleteButton'));
      fireEvent.click(
        within(await screen.findByTestId('esqlViewsDeleteConfirmModal')).getByRole('button', {
          name: 'Delete',
        })
      );

      await waitFor(() => {
        expect(screen.queryByText('logs-view')).not.toBeInTheDocument();
      });
      expect(screen.getByText('users-view')).toBeInTheDocument();
      expect(screen.queryByTestId('esqlViewsBulkDeleteButton')).not.toBeInTheDocument();
      expect(within(getRow('users-view')).getByRole('checkbox')).not.toBeChecked();
    });

    it('reports a failed bulk deletion', async () => {
      const client = createClient();
      client.getViews.mockResolvedValue(twoViews);
      client.deleteViews.mockRejectedValue(createClientError('Forbidden', 403));
      const { toasts } = notificationServiceMock.createStartContract();

      renderApp(client, { toasts });
      await screen.findByText('logs-view');

      fireEvent.click(within(getRow('logs-view')).getByRole('checkbox'));
      fireEvent.click(within(getRow('orders-view')).getByRole('checkbox'));
      fireEvent.click(await screen.findByTestId('esqlViewsBulkDeleteButton'));
      fireEvent.click(
        within(await screen.findByTestId('esqlViewsDeleteConfirmModal')).getByRole('button', {
          name: 'Delete',
        })
      );

      await waitFor(() => {
        expect(toasts.addDanger).toHaveBeenCalledWith({
          title: 'Failed to delete 2 views.',
          text: 'Forbidden',
        });
      });
      expect(client.deleteViews).toHaveBeenCalledWith(['logs-view', 'orders-view']);
      expect(client.getViews).toHaveBeenCalledTimes(2);
      expect(screen.queryByTestId('esqlViewsBulkDeleteButton')).not.toBeInTheDocument();
    });

    it('does not delete when the confirmation is cancelled', async () => {
      const client = createClient();
      client.getViews.mockResolvedValue(twoViews);

      renderApp(client);
      await screen.findByText('logs-view');

      await openDeleteAction('logs-view');
      const modal = await screen.findByTestId('esqlViewsDeleteConfirmModal');
      fireEvent.click(within(modal).getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('esqlViewsDeleteConfirmModal')).not.toBeInTheDocument();
      });
      expect(client.deleteViews).not.toHaveBeenCalled();
      expect(client.getViews).toHaveBeenCalledTimes(1);
      expect(screen.getByText('logs-view')).toBeInTheDocument();
    });

    it('reports a failed deletion and refreshes the table', async () => {
      const client = createClient();
      client.getViews.mockResolvedValue(twoViews);
      client.deleteViews.mockRejectedValue(createClientError('Forbidden', 403));
      const { toasts } = notificationServiceMock.createStartContract();

      renderApp(client, { toasts });
      await screen.findByText('logs-view');

      await openDeleteAction('logs-view');
      const modal = await screen.findByTestId('esqlViewsDeleteConfirmModal');
      fireEvent.click(within(modal).getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.queryByTestId('esqlViewsDeleteConfirmModal')).not.toBeInTheDocument();
      });
      expect(toasts.addDanger).toHaveBeenCalledWith({
        title: 'Failed to delete view "logs-view".',
        text: 'Forbidden',
      });
      expect(toasts.addSuccess).not.toHaveBeenCalled();
      expect(client.getViews).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('esqlViewsTable')).toBeInTheDocument();
      expect(screen.getByText('logs-view')).toBeInTheDocument();
    });
  });
});
