/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

// Unlike `esql_editor.test.tsx`, these tests keep the real `useInitializeChart`
// hook: they cover the interaction between the initial load and a query the
// user submits while that load is still in flight.

let capturedOnSubmit:
  | ((q: AggregateQuery, abortController?: AbortController) => Promise<void>)
  | undefined;
let capturedOnChange: ((q: AggregateQuery) => void) | undefined;
let capturedIsLoading: boolean | undefined;

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: (props: {
    onTextLangQuerySubmit: (q: AggregateQuery, a?: AbortController) => Promise<void>;
    onTextLangQueryChange: (q: AggregateQuery) => void;
    isLoading?: boolean;
  }) => {
    capturedOnSubmit = props.onTextLangQuerySubmit;
    capturedOnChange = props.onTextLangQueryChange;
    capturedIsLoading = props.isLoading;
    return null;
  },
  useESQLQueryStats: jest.fn().mockReturnValue(undefined),
}));

jest.mock('../../../app_plugin/shared/edit_on_the_fly/helpers', () => ({
  getSuggestions: jest.fn().mockResolvedValue(undefined),
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

// `getSuggestions` takes positional arguments; the annotation makes a reorder of
// its signature a type error here instead of a silently wrong test.
const readShouldUpdateAttrs = (args: Parameters<typeof getSuggestions>) => {
  const shouldUpdateAttrs: boolean | undefined = args[11];
  return shouldUpdateAttrs ?? true;
};

const initialQuery = { esql: 'FROM index1' };
const submittedQuery = { esql: 'FROM index1 | STATS maxB = MAX(bytes)' };
const laterQuery = { esql: 'FROM index1 | STATS minB = MIN(bytes)' };

describe('ESQLEditor initialization', () => {
  const coreStart = coreMock.createStart();

  const attributes = {
    title: '',
    visualizationType: 'lnsXY',
    references: [],
    state: {
      query: initialQuery,
      filters: [],
      datasourceStates: { textBased: { layers: {} } },
      visualization: {},
      adHocDataViews: {},
    },
  } as unknown as TypedLensSerializedState['attributes'];

  // Stand in for the attributes the suggestion API builds for each query
  const suggestedAttributes: TypedLensSerializedState['attributes'] = {
    ...attributes,
    title: 'suggested for the submitted query',
  };
  const laterSuggestedAttributes: TypedLensSerializedState['attributes'] = {
    ...attributes,
    title: 'suggested for the later query',
  };

  const renderEditor = () => {
    const setCurrentAttributes = jest.fn();
    const updateSuggestion = jest.fn();
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
      setCurrentAttributes,
      updateSuggestion,
      onTextBasedQueryStateChange: jest.fn(),
    } as unknown as ESQLEditorProps;

    renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={mockVisualizationMap()}
        datasourceMap={mockDatasourceMap()}
      >
        <ESQLEditor {...props} />
      </EditorFrameServiceProvider>
    );

    return { setCurrentAttributes, updateSuggestion };
  };

  beforeEach(() => {
    capturedOnSubmit = undefined;
    capturedOnChange = undefined;
    capturedIsLoading = undefined;
    getSuggestionsMock.mockReset();
    // The initial load never settles, so the chart stays uninitialized while
    // the user edits and submits the query. Any other run resolves with
    // attributes when it is meant to update the chart.
    getSuggestionsMock.mockImplementation((...args) => {
      const query = args[0];
      if (query.esql === initialQuery.esql) {
        return new Promise(() => {});
      }
      if (!readShouldUpdateAttrs(args)) {
        return Promise.resolve(undefined) as ReturnType<typeof getSuggestions>;
      }
      return Promise.resolve(
        query.esql === laterQuery.esql ? laterSuggestedAttributes : suggestedAttributes
      ) as ReturnType<typeof getSuggestions>;
    });
  });

  it('applies a query submitted while the initial load is still in flight', async () => {
    const { updateSuggestion, setCurrentAttributes } = renderEditor();
    await waitFor(() => expect(capturedOnSubmit).toBeDefined());

    // Typing updates the editor query without submitting it.
    act(() => capturedOnChange!(submittedQuery));
    await act(async () => {});

    await act(() => capturedOnSubmit!(submittedQuery, new AbortController()));

    expect(setCurrentAttributes).toHaveBeenCalledTimes(1);
    expect(setCurrentAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ title: suggestedAttributes.title })
    );
    expect(updateSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ title: suggestedAttributes.title })
    );
  });

  it('ignores a slow run that settles after a newer one', async () => {
    let resolveSlowRun: () => void = () => {};
    const slowRun = new Promise<unknown>((resolve) => {
      resolveSlowRun = () => resolve(suggestedAttributes);
    }) as ReturnType<typeof getSuggestions>;
    const defaultImplementation = getSuggestionsMock.getMockImplementation()!;
    getSuggestionsMock.mockImplementation((...args) =>
      args[0].esql === submittedQuery.esql ? slowRun : defaultImplementation(...args)
    );

    const { updateSuggestion, setCurrentAttributes } = renderEditor();
    await waitFor(() => expect(capturedOnSubmit).toBeDefined());

    // The first submission hangs, so the user submits a newer query...
    act(() => {
      capturedOnSubmit!(submittedQuery, new AbortController());
    });
    await act(() => capturedOnSubmit!(laterQuery, new AbortController()));

    // ...and the stale response must not overwrite what the newer one applied.
    await act(async () => resolveSlowRun());

    expect(setCurrentAttributes).toHaveBeenCalledTimes(1);
    expect(setCurrentAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ title: laterSuggestedAttributes.title })
    );
    expect(updateSuggestion).toHaveBeenCalledTimes(1);
    expect(updateSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ title: laterSuggestedAttributes.title })
    );
  });

  it('keeps showing the loading state when a superseded run settles', async () => {
    let resolveInitialRun: () => void = () => {};
    let resolveSubmittedRun: () => void = () => {};
    const initialRun = new Promise<unknown>((resolve) => {
      resolveInitialRun = () => resolve(undefined);
    }) as ReturnType<typeof getSuggestions>;
    const submittedRun = new Promise<unknown>((resolve) => {
      resolveSubmittedRun = () => resolve(suggestedAttributes);
    }) as ReturnType<typeof getSuggestions>;
    getSuggestionsMock.mockImplementation((...args) =>
      args[0].esql === initialQuery.esql ? initialRun : submittedRun
    );

    renderEditor();
    await waitFor(() => expect(capturedOnSubmit).toBeDefined());

    // The submission hangs, so the editor stays in its loading state...
    act(() => {
      capturedOnSubmit!(submittedQuery, new AbortController());
    });
    expect(capturedIsLoading).toBe(true);

    // ...and the initial run, superseded by it, must not clear that state.
    await act(async () => resolveInitialRun());
    expect(capturedIsLoading).toBe(true);

    await act(async () => resolveSubmittedRun());
    expect(capturedIsLoading).toBe(false);
  });
});
