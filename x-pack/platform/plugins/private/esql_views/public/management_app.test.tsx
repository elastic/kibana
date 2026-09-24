/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { EsqlViewsResult } from '@kbn/esql-types';
import {
  ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE,
  EsqlViewsClientError,
  type EsqlViewsClient,
} from '@kbn/esql-utils';
import { getQueryPreview } from './esql_views_table';
import { ManagementApp } from './management_app';

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    dataTestSubj,
    onTextLangQueryChange,
    query,
  }: {
    dataTestSubj?: string;
    onTextLangQueryChange: (nextQuery: { esql: string }) => void;
    query: { esql: string };
  }) => (
    <textarea
      data-test-subj={dataTestSubj}
      onChange={({ target }) => onTextLangQueryChange({ esql: target.value })}
      value={query.esql}
    />
  ),
}));

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

const renderApp = (
  client: EsqlViewsClient,
  { canCreate = true, canEdit = true }: { canCreate?: boolean; canEdit?: boolean } = {}
) =>
  render(
    <EuiProvider>
      <MockAppHeaderProvider>
        <ManagementApp
          canCreate={canCreate}
          canEdit={canEdit}
          client={client}
          documentationUrl={documentationUrl}
        />
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
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    expect(client.getViews).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('hides create and edit actions without their capabilities', async () => {
    const client = createClient();
    client.getViews.mockResolvedValue({
      views: [{ name: 'logs-view', query: 'FROM logs-*' }],
    });

    renderApp(client, { canCreate: false, canEdit: false });

    await screen.findByText('logs-view');
    expect(screen.queryByTestId('esqlViewsCreateButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('esqlViewsActionsButton')).not.toBeInTheDocument();
  });

  it('validates fields while creating a view and refetches after saving', async () => {
    const client = createClient();
    client.getViews.mockResolvedValueOnce({ views: [] }).mockResolvedValueOnce({
      views: [
        {
          name: 'sales-view',
          description: 'Sales transactions',
          query: 'FROM transactions-*',
        },
      ],
    });
    client.createView.mockResolvedValue({ acknowledged: true });

    renderApp(client);

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));

    expect(
      screen.getByText(
        'Changes affect every dashboard, alert, and other saved object that uses this view.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ES|QL view details' })).toBeInTheDocument();
    expect(screen.getByText('Name and describe the view.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. my-view')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Must not match an existing index, data stream, alias, external dataset, or view.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Description (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe this view')).toBeInTheDocument();
    expect(
      screen.getByText('Add a brief description to help identify this view.')
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ES|QL query' })).toBeInTheDocument();
    expect(
      screen.getByText('Write a new query, or select a recently or starred query.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('esqlViewQueryEditor')).toHaveValue(
      'FROM kibana_sample_data_ecommerce | WHERE KQL("term")'
    );

    const nameInput = screen.getByTestId('esqlViewNameInput');
    fireEvent.change(nameInput, { target: { value: 'Sales view' } });
    expect(
      screen.getByText('Use lowercase letters, numbers, hyphens, and underscores only.')
    ).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'sales-view' } });
    fireEvent.change(screen.getByTestId('esqlViewDescriptionInput'), {
      target: { value: 'Sales transactions' },
    });
    fireEvent.change(screen.getByTestId('esqlViewQueryEditor'), {
      target: { value: 'FROM transactions-*' },
    });
    fireEvent.click(screen.getByTestId('esqlViewSaveButton'));

    await waitFor(() =>
      expect(client.createView).toHaveBeenCalledWith({
        name: 'sales-view',
        description: 'Sales transactions',
        query: 'FROM transactions-*',
      })
    );
    expect(await screen.findByText('sales-view')).toBeInTheDocument();
    expect(client.getViews).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('esqlViewFormFlyout')).not.toBeInTheDocument();
  });

  it('edits a view with an immutable name and refetches after saving', async () => {
    const client = createClient();
    client.getViews
      .mockResolvedValueOnce({
        views: [{ name: 'legacy.view', description: 'Logs', query: 'FROM logs-*' }],
      })
      .mockResolvedValueOnce({
        views: [
          {
            name: 'legacy.view',
            description: 'Production logs',
            query: 'FROM production-logs-*',
          },
        ],
      });
    client.updateView.mockResolvedValue({ acknowledged: true });

    renderApp(client);

    await screen.findByText('legacy.view');
    fireEvent.click(screen.getByRole('button', { name: 'Actions for legacy.view' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));

    expect(screen.getByTestId('esqlViewNameInput')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByTestId('esqlViewDescriptionInput'), {
      target: { value: 'Production logs' },
    });
    fireEvent.change(screen.getByTestId('esqlViewQueryEditor'), {
      target: { value: 'FROM production-logs-*' },
    });
    fireEvent.click(screen.getByTestId('esqlViewSaveButton'));

    await waitFor(() =>
      expect(client.updateView).toHaveBeenCalledWith({
        name: 'legacy.view',
        description: 'Production logs',
        query: 'FROM production-logs-*',
      })
    );
    expect(await screen.findByText('Production logs')).toBeInTheDocument();
    expect(client.getViews).toHaveBeenCalledTimes(2);
  });

  it('shows a stable name conflict with the exact Elasticsearch error in a tooltip', async () => {
    const client = createClient();
    client.getViews.mockResolvedValue({ views: [] });
    client.createView.mockRejectedValue(
      new EsqlViewsClientError(
        'an index or data stream exists with the same name',
        400,
        'resource_already_exists_exception'
      )
    );

    renderApp(client);

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));
    fireEvent.change(screen.getByTestId('esqlViewNameInput'), {
      target: { value: 'sales-view' },
    });
    fireEvent.change(screen.getByTestId('esqlViewQueryEditor'), {
      target: { value: 'ROW value = 1' },
    });
    fireEvent.click(screen.getByTestId('esqlViewSaveButton'));

    expect(
      await screen.findByText('This name is already used by another Elasticsearch resource.')
    ).toBeInTheDocument();

    const tooltipAnchor = screen
      .getByTestId('esqlViewNameConflictDetails')
      .querySelector('.euiToolTipAnchor');
    if (!tooltipAnchor) {
      throw new Error('Expected the conflict details tooltip anchor');
    }
    fireEvent.mouseOver(tooltipAnchor);
    expect(
      await screen.findByText('an index or data stream exists with the same name')
    ).toBeInTheDocument();
  });

  it('shows an inline error without a tooltip when a view already exists', async () => {
    const client = createClient();
    client.getViews.mockResolvedValue({ views: [] });
    client.createView.mockRejectedValue(
      new EsqlViewsClientError(
        'An ES|QL view named "sales-view" already exists',
        409,
        ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE
      )
    );

    renderApp(client);

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));
    fireEvent.change(screen.getByTestId('esqlViewNameInput'), {
      target: { value: 'sales-view' },
    });
    fireEvent.change(screen.getByTestId('esqlViewQueryEditor'), {
      target: { value: 'ROW value = 1' },
    });
    fireEvent.click(screen.getByTestId('esqlViewSaveButton'));

    expect(await screen.findByText('A view with this name already exists.')).toBeInTheDocument();
    expect(screen.queryByTestId('esqlViewNameConflictDetails')).not.toBeInTheDocument();
  });

  it('blocks saving a query with invalid ES|QL syntax', async () => {
    const client = createClient();
    client.getViews.mockResolvedValue({ views: [] });

    renderApp(client);

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));
    fireEvent.change(screen.getByTestId('esqlViewNameInput'), {
      target: { value: 'invalid-query-view' },
    });
    fireEvent.change(screen.getByTestId('esqlViewQueryEditor'), {
      target: { value: 'ROW value =' },
    });
    fireEvent.click(screen.getByTestId('esqlViewSaveButton'));

    expect(await screen.findByText(/Fix the ES\|QL syntax:/)).toBeInTheDocument();
    expect(client.createView).not.toHaveBeenCalled();
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
});
