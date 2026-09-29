/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { act, waitFor } from '@testing-library/react';
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
import { getSuggestions } from '../../../app_plugin/shared/edit_on_the_fly/helpers';

// Capture the submit callback that `ESQLEditor` wires into the language
// editor so the test can drive query submissions directly.
let capturedOnSubmit:
  | ((q: AggregateQuery, abortController?: AbortController) => Promise<void>)
  | undefined;

vi.mock('@kbn/esql/public', () => {
      const mocked = {
      ESQLLangEditor: (props: {
        onTextLangQuerySubmit: (q: AggregateQuery, a?: AbortController) => Promise<void>;
      }) => {
        capturedOnSubmit = props.onTextLangQuerySubmit;
        return null;
      },
      useESQLQueryStats: vi.fn().mockReturnValue(undefined),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../app_plugin/shared/edit_on_the_fly/helpers', () => {
      const mocked = {
      getSuggestions: vi.fn().mockResolvedValue(undefined),
    };
      return { ...mocked, default: mocked };
    });

// The initialization hook triggers an initial `runQuery` against real
// services; irrelevant for these tests, which submit queries explicitly.
vi.mock('./use_initialize_chart', () => {
      const mocked = {
      useInitializeChart: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../app_plugin/shared/edit_on_the_fly/use_esql_variables', () => {
      const mocked = {
      useESQLVariables: vi.fn().mockReturnValue({
        onSaveControl: vi.fn(),
        onCancelControl: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/presentation-publishing', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/presentation-publishing')),
      useFetchContext: vi.fn().mockReturnValue({ esqlVariables: [], isApproximate: false }),
    };
      return { ...mocked, default: mocked };
    });

const getSuggestionsMock = getSuggestions as MockedFunction<typeof getSuggestions>;

describe('ESQLEditor', () => {
  const coreStart = coreMock.createStart();

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
      closeFlyout: vi.fn(),
      editorContainer: undefined,
      dataLoading$: undefined,
      setCurrentAttributes: vi.fn(),
      updateSuggestion: vi.fn(),
      onTextBasedQueryStateChange: vi.fn(),
    } as unknown as ESQLEditorProps;

    return renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={mockVisualizationMap()}
        datasourceMap={mockDatasourceMap()}
      >
        <ESQLEditor {...props} />
      </EditorFrameServiceProvider>
    );
  };

  beforeEach(() => {
    capturedOnSubmit = undefined;
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
});
