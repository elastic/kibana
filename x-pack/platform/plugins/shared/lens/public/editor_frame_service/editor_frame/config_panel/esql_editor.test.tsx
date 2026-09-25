/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AggregateQuery } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import type { TypedLensSerializedState } from '@kbn/lens-common';
import {
  renderWithReduxStore,
  mockVisualizationMap,
  mockDatasourceMap,
  mockDataPlugin,
} from '../../../mocks';
import { EditorFrameServiceProvider } from '../../editor_frame_service_context';
import { ESQLEditor, type ESQLEditorProps } from './esql_editor';
import { ESQLEditorContext } from './esql_editor_context';
import type { ESQLDataGridAttrs } from '../../../app_plugin/shared/edit_on_the_fly/helpers';
import { getSuggestions } from '../../../app_plugin/shared/edit_on_the_fly/helpers';

// Capture the submit callback that `ESQLEditor` wires into the language
// editor so the test can drive query submissions directly.
let capturedOnSubmit:
  | ((q: AggregateQuery, abortController?: AbortController) => Promise<void>)
  | undefined;

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: (props: {
    onTextLangQuerySubmit: (q: AggregateQuery, a?: AbortController) => Promise<void>;
  }) => {
    capturedOnSubmit = props.onTextLangQuerySubmit;
    return null;
  },
  useESQLQueryStats: jest.fn().mockReturnValue(undefined),
}));

jest.mock('../../../app_plugin/shared/edit_on_the_fly/helpers', () => ({
  getSuggestions: jest.fn().mockResolvedValue(undefined),
}));

// The initialization hook triggers an initial `runQuery` against real
// services; irrelevant for these tests, which submit queries explicitly.
jest.mock('./use_initialize_chart', () => ({
  useInitializeChart: jest.fn(),
}));

jest.mock('../../../app_plugin/shared/edit_on_the_fly/use_esql_variables', () => ({
  useESQLVariables: jest.fn().mockReturnValue({
    onSaveControl: jest.fn(),
    onCancelControl: jest.fn(),
  }),
}));

jest.mock('@kbn/presentation-publishing', () => ({
  ...jest.requireActual('@kbn/presentation-publishing'),
  useFetchContext: jest.fn().mockReturnValue({ esqlVariables: [], isApproximate: false }),
}));

const getSuggestionsMock = getSuggestions as jest.MockedFunction<typeof getSuggestions>;

jest.mock('@kbn/esql-datagrid/public', () => ({
  ESQLDataGrid: () => null,
}));

describe('ESQLEditor', () => {
  const coreStart = coreMock.createStart();
  const lastPreviewRef: { current: ESQLDataGridAttrs | undefined } = { current: undefined };

  const attributes = {
    title: '',
    visualizationType: 'lnsXY',
    references: [],
    state: {
      query: { esql: 'FROM index1' },
      filters: [],
      datasourceStates: { textBased: { layers: {} } },
      visualization: {},
      adHocDataViews: {},
    },
  } as unknown as TypedLensSerializedState['attributes'];

  const renderEditor = () => {
    const props = {
      data: mockDataPlugin(),
      http: coreStart.http,
      uiSettings: coreStart.uiSettings,
      attributes,
      framePublicAPI: { dataViews: { indexPatterns: {} } },
      isTextBasedLanguage: true,
      lensAdapters: undefined,
      parentApi: undefined,
      panelId: undefined,
      layerId: 'layer1',
      closeFlyout: jest.fn(),
      editorContainer: undefined,
      dataLoading$: undefined,
      setCurrentAttributes: jest.fn(),
      updateSuggestion: jest.fn(),
      onTextBasedQueryStateChange: jest.fn(),
    } as unknown as ESQLEditorProps;

    return renderWithReduxStore(
      <ESQLEditorContext.Provider
        value={{ editorHeightRef: { current: undefined }, lastPreviewRef }}
      >
        <EditorFrameServiceProvider
          visualizationMap={mockVisualizationMap()}
          datasourceMap={mockDatasourceMap()}
        >
          <ESQLEditor {...props} />
        </EditorFrameServiceProvider>
      </ESQLEditorContext.Provider>
    );
  };

  beforeEach(() => {
    capturedOnSubmit = undefined;
    lastPreviewRef.current = undefined;
    getSuggestionsMock.mockClear();
    getSuggestionsMock.mockResolvedValue(undefined);
  });

  it('runs the same query again after the previous run was aborted', async () => {
    renderEditor();
    await waitFor(() => expect(capturedOnSubmit).toBeDefined());

    const query = { esql: 'FROM index1 | STATS maxB = MAX(bytes)' };

    // First submission: the run gets cancelled mid-flight (the editor's
    // Search/Cancel button aborts the signal while getSuggestions is pending).
    const abortedController = new AbortController();
    getSuggestionsMock.mockImplementationOnce(async () => {
      abortedController.abort();
      return undefined;
    });
    await act(() => capturedOnSubmit!(query, abortedController));
    expect(getSuggestionsMock).toHaveBeenCalledTimes(1);

    // Second submission of the *same* text must run again: an aborted run
    // produced no result, so it must not count as "already submitted".
    await act(() => capturedOnSubmit!(query, new AbortController()));
    expect(getSuggestionsMock).toHaveBeenCalledTimes(2);
  });

  it('does not re-run the same query after a successful run', async () => {
    renderEditor();
    await waitFor(() => expect(capturedOnSubmit).toBeDefined());

    const query = { esql: 'FROM index1 | STATS maxB = MAX(bytes)' };

    await act(() => capturedOnSubmit!(query, new AbortController()));
    expect(getSuggestionsMock).toHaveBeenCalledTimes(1);

    // Same text again: deduplicated, no new run.
    await act(() => capturedOnSubmit!(query, new AbortController()));
    expect(getSuggestionsMock).toHaveBeenCalledTimes(1);
  });

  it('keeps last ES|QL preview rows after the editor remounts', async () => {
    const preview = {
      rows: [{ a: 1 }, { a: 2 }, { a: 3 }],
      columns: [],
      dataView: {},
    } as unknown as ESQLDataGridAttrs;

    getSuggestionsMock.mockImplementation(async (...args: unknown[]) => {
      const setDataGridAttrs = args[9] as ((attrs: ESQLDataGridAttrs) => void) | undefined;
      setDataGridAttrs?.(preview);
      return undefined;
    });

    const { unmount } = renderEditor();
    await waitFor(() => expect(capturedOnSubmit).toBeDefined());
    await act(() =>
      capturedOnSubmit!({ esql: 'FROM index1 | STATS maxB = MAX(bytes)' }, new AbortController())
    );
    expect(screen.getByTestId('ESQLQueryResults')).toHaveTextContent('3');
    unmount();

    getSuggestionsMock.mockClear();
    getSuggestionsMock.mockReturnValue(new Promise(() => {}));
    renderEditor();
    const results = screen.getByTestId('ESQLQueryResults');
    expect(results).toHaveTextContent('3');
    expect(within(results).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(getSuggestionsMock).not.toHaveBeenCalled();

    // While a refresh is in flight EuiAccordion swaps `extraAction` for its spinner
    await waitFor(() => expect(capturedOnSubmit).toBeDefined());
    act(() => {
      void capturedOnSubmit!(
        { esql: 'FROM index1 | STATS minB = MIN(bytes)' },
        new AbortController()
      );
    });
    await waitFor(() =>
      expect(
        within(screen.getByTestId('ESQLQueryResults')).getByRole('progressbar')
      ).toBeInTheDocument()
    );
  });

  it('stops showing the loading spinner when a refresh fails with cached rows', async () => {
    const preview = {
      rows: [{ a: 1 }, { a: 2 }, { a: 3 }],
      columns: [],
      dataView: {},
    } as unknown as ESQLDataGridAttrs;

    getSuggestionsMock.mockImplementationOnce(async (...args: unknown[]) => {
      const setDataGridAttrs = args[9] as ((attrs: ESQLDataGridAttrs) => void) | undefined;
      setDataGridAttrs?.(preview);
      return undefined;
    });

    renderEditor();
    await waitFor(() => expect(capturedOnSubmit).toBeDefined());
    await act(() =>
      capturedOnSubmit!({ esql: 'FROM index1 | STATS maxB = MAX(bytes)' }, new AbortController())
    );
    expect(screen.getByTestId('ESQLQueryResults')).toHaveTextContent('3');

    // getSuggestions swallows query errors and resolves without new attrs
    getSuggestionsMock.mockResolvedValue(undefined);
    await act(() =>
      capturedOnSubmit!({ esql: 'FROM index1 | STATS broken(' }, new AbortController())
    );

    const results = screen.getByTestId('ESQLQueryResults');
    expect(within(results).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(results).toHaveTextContent('3');
  });

  it('shows an empty message in the open results accordion when the first preview fails', async () => {
    renderEditor();
    await waitFor(() => expect(capturedOnSubmit).toBeDefined());

    const results = screen.getByTestId('ESQLQueryResults');
    await userEvent.click(within(results).getByRole('button', { name: /ES\|QL Query Results/i }));
    // Still loading: EuiAccordion's own loading message owns the content area
    expect(within(results).queryByTestId('ESQLQueryResultsEmpty')).not.toBeInTheDocument();

    getSuggestionsMock.mockImplementationOnce(async (...args: unknown[]) => {
      const setErrors = args[7] as ((errors: Error[]) => void) | undefined;
      setErrors?.([new Error('Unknown index [index1]')]);
      return undefined;
    });
    await act(() =>
      capturedOnSubmit!({ esql: 'FROM index1 | STATS maxB = MAX(bytes)' }, new AbortController())
    );

    expect(within(results).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(results).getByTestId('ESQLQueryResultsEmpty')).toBeInTheDocument();
    expect(within(results).getByTestId('ESQLQueryResultsErrorIcon')).toHaveAttribute(
      'data-euiicon-type',
      'error'
    );
  });

  it('does not show the error icon when the first preview returns nothing without an error', async () => {
    renderEditor();
    await waitFor(() => expect(capturedOnSubmit).toBeDefined());

    await act(() =>
      capturedOnSubmit!({ esql: 'FROM index1 | STATS maxB = MAX(bytes)' }, new AbortController())
    );

    const results = screen.getByTestId('ESQLQueryResults');
    expect(within(results).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(results).queryByTestId('ESQLQueryResultsErrorIcon')).not.toBeInTheDocument();
  });
});
