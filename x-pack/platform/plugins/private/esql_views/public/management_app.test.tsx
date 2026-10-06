/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { notificationServiceMock } from '@kbn/core/public/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import type { ESQLEditorProps } from '@kbn/esql-editor';
import type { EsqlViewsResult } from '@kbn/esql-types';
import {
  ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE,
  EsqlViewsClientError,
  type EsqlViewsClient,
} from '@kbn/esql-utils';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { getQueryPreview } from './esql_views_table';
import { ManagementApp } from './management_app';
import type { DiscoverEsqlLocatorParams } from './types';
import type {
  EsqlViewPreviewDependencies,
  EsqlViewPreviewResult,
  UseEsqlViewPreviewResult,
} from './use_esql_view_preview';

type EsqlEditorProps = Omit<ESQLEditorProps, 'ref'>;

const mockRunPreview = jest.fn().mockResolvedValue(undefined);
const mockResetPreview = jest.fn();
const mockResetPreviewIfQueryChanged = jest.fn();
const mockUseEsqlViewPreview = jest.fn<UseEsqlViewPreviewResult, [EsqlViewPreviewDependencies]>();
const mockEsqlDataGrid = jest.fn();

jest.mock('./use_esql_view_preview', () => ({
  useEsqlViewPreview: (dependencies: EsqlViewPreviewDependencies) =>
    mockUseEsqlViewPreview(dependencies),
}));

jest.mock('@kbn/esql-datagrid/public', () => ({
  ESQLDataGrid: (props: { rows: unknown[] }) => {
    mockEsqlDataGrid(props);
    return <div data-test-subj="mockEsqlDataGrid">{props.rows.length} preview rows</div>;
  },
}));

const MockEsqlEditor = ({
  dataTestSubj,
  isDisabled,
  onTextLangQueryChange,
  query,
}: EsqlEditorProps) => (
  <textarea
    data-test-subj={dataTestSubj}
    disabled={isDisabled}
    onChange={({ target }) => onTextLangQueryChange({ esql: target.value })}
    value={'esql' in query ? query.esql : ''}
  />
);

const documentationUrl = 'https://www.elastic.co/docs/reference/query-languages/esql/esql-views';
const previewDependencies = {
  dataViews: {},
  http: {},
  search: jest.fn(),
};

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
    canCreate = true,
    canEdit = true,
    EsqlEditor = MockEsqlEditor,
    isDiscoverAvailable = true,
    discoverLocator,
    toasts = notificationServiceMock.createStartContract().toasts,
  }: {
    canCreate?: boolean;
    canEdit?: boolean;
    EsqlEditor?: ComponentType<EsqlEditorProps>;
    isDiscoverAvailable?: boolean;
    discoverLocator?: ReturnType<typeof createDiscoverLocator>;
    toasts?: ReturnType<typeof notificationServiceMock.createStartContract>['toasts'];
  } = {}
) =>
  render(
    <EuiProvider>
      <MockAppHeaderProvider>
        <ManagementApp
          canCreate={canCreate}
          canEdit={canEdit}
          client={client}
          isDiscoverAvailable={isDiscoverAvailable}
          discoverLocator={discoverLocator}
          documentationUrl={documentationUrl}
          EsqlEditor={EsqlEditor}
          previewDependencies={previewDependencies as never}
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
  fireEvent.click(within(getRow(name)).getByTestId('esqlViewsActionsButton'));
  fireEvent.click(await screen.findByTestId('esqlViewsDeleteButton'));
};

describe('ManagementApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunPreview.mockResolvedValue(undefined);
    mockUseEsqlViewPreview.mockReturnValue({
      resetPreview: mockResetPreview,
      resetPreviewIfQueryChanged: mockResetPreviewIfQueryChanged,
      error: undefined,
      hasRun: false,
      isLoading: false,
      result: undefined,
      runPreview: mockRunPreview,
    });
  });

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
    expect(screen.queryByRole('link', { name: /Learn more/ })).not.toBeInTheDocument();
    await openAppMenuOverflow();
    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
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

    fireEvent.click(screen.getByTestId('esqlViewsActionsButton'));
    expect(await screen.findByTestId('esqlViewsDeleteButton')).toBeInTheDocument();
    expect(screen.queryByTestId('esqlViewsEditButton')).not.toBeInTheDocument();
  });

  it('offers edit and delete in the row actions menu with the edit capability', async () => {
    const client = createClient();
    client.getViews.mockResolvedValue(twoViews);

    renderApp(client);

    await screen.findByText('logs-view');
    fireEvent.click(within(getRow('logs-view')).getByTestId('esqlViewsActionsButton'));

    expect(await screen.findByTestId('esqlViewsEditButton')).toBeInTheDocument();
    expect(screen.getByTestId('esqlViewsDeleteButton')).toBeInTheDocument();
  });

  it('renders the form fields while the ES|QL editor loads', async () => {
    const client = createClient();
    let resolveEditor: ((module: { default: ComponentType<EsqlEditorProps> }) => void) | undefined;
    const LazyEsqlEditor = React.lazy(
      () =>
        new Promise<{ default: ComponentType<EsqlEditorProps> }>((resolve) => {
          resolveEditor = resolve;
        })
    );
    client.getViews.mockResolvedValue({ views: [] });

    renderApp(client, { EsqlEditor: LazyEsqlEditor });

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));

    expect(screen.getByTestId('esqlViewFormFlyout')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. my-view')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe this view')).toBeInTheDocument();
    expect(screen.getByTestId('esqlViewEditorLoading')).toHaveTextContent('Loading ES|QL editor');
    expect(screen.queryByTestId('esqlViewQueryEditor')).not.toBeInTheDocument();

    await act(async () => {
      if (!resolveEditor) {
        throw new Error('Editor request was not started');
      }
      resolveEditor({ default: MockEsqlEditor });
    });

    expect(await screen.findByTestId('esqlViewQueryEditor')).toBeInTheDocument();
  });

  it('enables the standard editor actions and previews submitted history queries', async () => {
    const client = createClient();
    const editorProps = jest.fn();
    const historyQuery = 'ROW source = "history"';
    const Editor = (props: EsqlEditorProps) => {
      editorProps(props);
      return (
        <>
          <MockEsqlEditor {...props} />
          <button
            data-test-subj="mockRunQuery"
            onClick={() => props.onTextLangQuerySubmit?.(props.query, new AbortController())}
            type="button"
          />
          <button
            data-test-subj="mockSelectHistoryQuery"
            onClick={() => {
              const previouslyRenderedQuery = props.query;
              props.onTextLangQueryChange({ esql: historyQuery });
              props.onTextLangQuerySubmit?.(previouslyRenderedQuery, new AbortController());
            }}
            type="button"
          />
        </>
      );
    };
    client.getViews.mockResolvedValueOnce({ views: [] }).mockResolvedValueOnce({
      views: [{ name: 'history-view', query: historyQuery }],
    });
    client.createView.mockResolvedValue({ acknowledged: true });

    renderApp(client, { EsqlEditor: Editor });

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));

    const initialEditorProps = editorProps.mock.lastCall?.[0];
    expect(initialEditorProps).toEqual(
      expect.objectContaining({
        allowQueryCancellation: true,
        disableSubmitAction: false,
        isLoading: false,
      })
    );
    expect(initialEditorProps.hideQueryHistory).toBeUndefined();
    expect(initialEditorProps.hideRunQueryButton).toBeUndefined();

    fireEvent.click(screen.getByTestId('mockRunQuery'));
    expect(mockRunPreview).toHaveBeenCalledWith(
      { esql: 'FROM kibana_sample_data_ecommerce | WHERE KQL("term")' },
      expect.any(AbortController)
    );

    fireEvent.click(screen.getByTestId('mockSelectHistoryQuery'));
    expect(screen.getByTestId('esqlViewQueryEditor')).toHaveValue(historyQuery);
    expect(mockResetPreviewIfQueryChanged).toHaveBeenCalledWith(historyQuery);
    expect(mockRunPreview).toHaveBeenLastCalledWith(
      { esql: historyQuery },
      expect.any(AbortController)
    );

    fireEvent.change(screen.getByTestId('esqlViewNameInput'), {
      target: { value: 'history-view' },
    });
    fireEvent.click(screen.getByTestId('esqlViewSaveButton'));

    await waitFor(() =>
      expect(client.createView).toHaveBeenCalledWith({
        description: undefined,
        name: 'history-view',
        query: historyQuery,
      })
    );
  });

  it('disables preview submission when the query is empty', async () => {
    const client = createClient();
    const editorProps = jest.fn();
    const Editor = (props: EsqlEditorProps) => {
      editorProps(props);
      return (
        <>
          <MockEsqlEditor {...props} />
          <button
            data-test-subj="mockRunQuery"
            onClick={() => props.onTextLangQuerySubmit?.(props.query, new AbortController())}
            type="button"
          />
        </>
      );
    };
    client.getViews.mockResolvedValue({ views: [] });

    renderApp(client, { EsqlEditor: Editor });

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));
    fireEvent.change(await screen.findByTestId('esqlViewQueryEditor'), {
      target: { value: '   ' },
    });

    expect(editorProps.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        allowQueryCancellation: false,
        disableSubmitAction: true,
      })
    );

    fireEvent.click(screen.getByTestId('mockRunQuery'));
    expect(mockRunPreview).not.toHaveBeenCalled();
  });

  it('matches the prototype preview accordion and configures the shared result grid', async () => {
    const client = createClient();
    const editorProps = jest.fn();
    const Editor = (props: EsqlEditorProps) => {
      editorProps(props);
      return <MockEsqlEditor {...props} />;
    };
    const previewResult: EsqlViewPreviewResult = {
      columns: [{ id: 'message', name: 'message', meta: { type: 'string' } }],
      dataView: {
        id: 'preview-data-view',
      } as unknown as EsqlViewPreviewResult['dataView'],
      query: { esql: 'FROM logs-*' },
      queryStats: {
        durationInMs: '12ms',
        totalDocumentsProcessed: 2,
      },
      rows: [['first'], ['second']],
    };
    mockUseEsqlViewPreview.mockReturnValue({
      resetPreview: mockResetPreview,
      resetPreviewIfQueryChanged: mockResetPreviewIfQueryChanged,
      error: undefined,
      hasRun: true,
      isLoading: false,
      result: previewResult,
      runPreview: mockRunPreview,
    });
    client.getViews.mockResolvedValue({ views: [] });

    renderApp(client, { EsqlEditor: Editor });

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));

    expect(screen.getByText('ES|QL Query Results')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('ES|QL Query Results'));

    expect(await screen.findByTestId('mockEsqlDataGrid')).toHaveTextContent('2 preview rows');
    expect(mockEsqlDataGrid).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: previewResult.columns,
        controlColumnIds: ['openDetails'],
        dataView: previewResult.dataView,
        flyoutType: 'overlay',
        initialRowHeight: 0,
        isTableView: true,
        query: previewResult.query,
        rows: previewResult.rows,
      })
    );
    expect(editorProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ queryStats: previewResult.queryStats })
    );
  });

  it('shows the prototype empty preview before the first run', async () => {
    const client = createClient();
    client.getViews.mockResolvedValue({ views: [] });

    renderApp(client);

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));
    fireEvent.click(screen.getByText('ES|QL Query Results'));

    expect(screen.getByText('No results yet')).toBeInTheDocument();
    expect(
      screen.getByText('Run the query above to preview its results here.')
    ).toBeInTheDocument();
  });

  it('validates fields while creating a view and refetches after saving', async () => {
    const client = createClient();
    client.getViews.mockResolvedValueOnce({ views: [] }).mockResolvedValueOnce({
      views: [
        {
          name: 'sales.view',
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
      await screen.findByText(
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
      screen.getByText(
        'Use lowercase characters. Names can\'t start with -, _, or +, be . or .., or contain spaces, commas, \\, /, *, ?, ", <, >, |, #, or :.'
      )
    ).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'sales.view' } });
    fireEvent.change(screen.getByTestId('esqlViewDescriptionInput'), {
      target: { value: 'Sales transactions' },
    });
    fireEvent.change(screen.getByTestId('esqlViewQueryEditor'), {
      target: { value: 'FROM transactions-*' },
    });
    fireEvent.click(screen.getByTestId('esqlViewSaveButton'));

    await waitFor(() =>
      expect(client.createView).toHaveBeenCalledWith({
        name: 'sales.view',
        description: 'Sales transactions',
        query: 'FROM transactions-*',
      })
    );
    expect(await screen.findByText('sales.view')).toBeInTheDocument();
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

    expect(await screen.findByTestId('esqlViewNameInput')).toHaveAttribute('readonly');
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

  it('locks editable fields while saving', async () => {
    const client = createClient();
    let resolveCreate: (() => void) | undefined;
    client.getViews.mockResolvedValue({ views: [] });
    client.createView.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = () => resolve({ acknowledged: true });
        })
    );

    renderApp(client);

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));
    fireEvent.change(await screen.findByTestId('esqlViewNameInput'), {
      target: { value: 'sales-view' },
    });
    fireEvent.click(screen.getByTestId('esqlViewSaveButton'));

    await waitFor(() => expect(client.createView).toHaveBeenCalled());
    expect(screen.getByTestId('esqlViewNameInput')).toBeDisabled();
    expect(screen.getByTestId('esqlViewDescriptionInput')).toBeDisabled();
    expect(screen.getByTestId('esqlViewQueryEditor')).toBeDisabled();
    expect(screen.getByTestId('esqlViewCancelButton')).toBeDisabled();
    // The EUI Jest mock does not forward closeButtonProps, so exercise the guarded close callback.
    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(screen.getByTestId('esqlViewFormFlyout')).toBeInTheDocument();

    await act(async () => {
      if (!resolveCreate) {
        throw new Error('Create request was not started');
      }
      resolveCreate();
    });

    await waitFor(() => expect(screen.queryByTestId('esqlViewFormFlyout')).not.toBeInTheDocument());
  });

  it('shows a stable name conflict with the exact Elasticsearch error in a tooltip', async () => {
    const client = createClient();
    client.getViews.mockResolvedValue({ views: [] });
    client.createView.mockRejectedValue(
      new EsqlViewsClientError(
        'an index or data stream exists with the same name',
        400,
        undefined,
        'resource_already_exists_exception'
      )
    );

    renderApp(client);

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));
    fireEvent.change(await screen.findByTestId('esqlViewNameInput'), {
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
        undefined,
        ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE
      )
    );

    renderApp(client);

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));
    fireEvent.change(await screen.findByTestId('esqlViewNameInput'), {
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
    fireEvent.change(await screen.findByTestId('esqlViewNameInput'), {
      target: { value: 'invalid-query-view' },
    });
    fireEvent.change(screen.getByTestId('esqlViewQueryEditor'), {
      target: { value: 'ROW value =' },
    });
    fireEvent.click(screen.getByTestId('esqlViewSaveButton'));

    expect(await screen.findByText(/Fix the ES\|QL syntax:/)).toBeInTheDocument();
    expect(client.createView).not.toHaveBeenCalled();
  });

  it('allows saving a syntactically valid view after preview fails', async () => {
    const client = createClient();
    client.getViews.mockResolvedValueOnce({ views: [] }).mockResolvedValueOnce({
      views: [{ name: 'preview-failure-view', query: 'ROW value = 1' }],
    });
    client.createView.mockResolvedValue({ acknowledged: true });
    mockUseEsqlViewPreview.mockReturnValue({
      resetPreview: mockResetPreview,
      resetPreviewIfQueryChanged: mockResetPreviewIfQueryChanged,
      error: new Error('Preview request failed'),
      hasRun: true,
      isLoading: false,
      result: undefined,
      runPreview: mockRunPreview,
    });

    renderApp(client);

    await screen.findByText('No ES|QL views found');
    fireEvent.click(screen.getByTestId('esqlViewsCreateButton'));
    fireEvent.change(await screen.findByTestId('esqlViewNameInput'), {
      target: { value: 'preview-failure-view' },
    });
    fireEvent.change(screen.getByTestId('esqlViewQueryEditor'), {
      target: { value: 'ROW value = 1' },
    });
    fireEvent.click(screen.getByTestId('esqlViewSaveButton'));

    await waitFor(() =>
      expect(client.createView).toHaveBeenCalledWith({
        name: 'preview-failure-view',
        query: 'ROW value = 1',
        description: undefined,
      })
    );
    expect(await screen.findByText('preview-failure-view')).toBeInTheDocument();
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

    it('quotes view names that ES|QL cannot parse unquoted', async () => {
      const client = createClient();
      client.getViews.mockResolvedValue({ views: [{ name: 'test=1', query: 'FROM logs-*' }] });
      const discoverLocator = createDiscoverLocator();

      renderApp(client, { discoverLocator });
      await screen.findByText('test=1');

      fireEvent.click(within(getRow('test=1')).getByTestId('esqlViewsOpenInDiscoverAction'));

      expect(discoverLocator.navigateSync).toHaveBeenCalledWith({
        query: { esql: 'FROM "test=1"' },
      });
    });

    it('disables the action when the user cannot access Discover', async () => {
      const client = createClient();
      client.getViews.mockResolvedValue(twoViews);
      const discoverLocator = createDiscoverLocator();

      renderApp(client, { discoverLocator, isDiscoverAvailable: false });
      await screen.findByText('logs-view');

      const action = within(getRow('logs-view')).getByTestId('esqlViewsOpenInDiscoverAction');
      expect(action).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(action);
      expect(discoverLocator.navigateSync).not.toHaveBeenCalled();
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
      expect(within(otherRow).getByTestId('esqlViewsActionsButton')).toHaveAttribute(
        'aria-label',
        'Actions for orders-view'
      );

      fireEvent.click(within(getRow('logs-view')).getByRole('checkbox'));

      await waitFor(() => {
        expect(within(otherRow).getByTestId('esqlViewsActionsButton')).toHaveAttribute(
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
