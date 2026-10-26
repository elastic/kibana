/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactElement } from 'react';
import { act, render, type RenderResult } from '@testing-library/react';
import type { FetchContext } from '@kbn/presentation-publishing';
import { appDocumentSchema, collectSources, type AppDocument } from '@kbn/custom-app-common';
import { createDataLayer, type DataLayer, type RunCases, type RunQuery } from '../data/data_layer';
import { DataLayerContext } from '../data/data_layer_context';
import { createAppRuntime, type AppRuntime } from '../runtime/app_runtime';
import { InlineEditContext, type ChangeNodeWords } from '../runtime/inline_edit_context';
import { AppRuntimeContext } from '../runtime/app_runtime_context';
import { AppFrame } from './app_frame';
import { NodeRenderer } from './node_renderer';

export const emptyDocument = (state: unknown = {}): AppDocument =>
  appDocumentSchema.parse({ state, root: { type: 'text', id: 'unused', text: '' } });

/** Renders a node inside a runtime built from the given document's declared state. */
export const renderWithRuntime = (
  ui: ReactElement,
  document: AppDocument = emptyDocument()
): { runtime: AppRuntime } & ReturnType<typeof render> => {
  const runtime = createAppRuntime(document);
  return {
    runtime,
    ...render(<AppRuntimeContext.Provider value={runtime}>{ui}</AppRuntimeContext.Provider>),
  };
};

/** The fetch context every test panel is refreshed with. */
const TEST_CONTEXT = { timeRange: { from: 'now-15m', to: 'now' } } as FetchContext;

/** Stands in for the ES|QL parser: finds `?name` and `??name`. */
const getParameterNames = (query: string) =>
  Array.from(query.matchAll(/\?\??([A-Za-z_]\w*)/g), ([, name]) => name);

/**
 * Renders a whole document the way the embeddable does: a runtime, a data layer fed by that
 * runtime's state, and the first fetch.
 */
export const renderApp = async (
  document: AppDocument,
  runQuery: RunQuery,
  runCases?: RunCases,
  /** Shows the app in the frame of a page, with its theme, as a page does. */
  {
    framed = false,
    changeWords,
  }: {
    framed?: boolean;
    /** Lets the words of the app be changed where they are shown, as the page of an app does. */
    changeWords?: ChangeNodeWords;
  } = {}
): Promise<{ runtime: AppRuntime; layer: DataLayer } & RenderResult> => {
  const runtime = createAppRuntime(document);
  const layer = createDataLayer({ runQuery, runCases, getParameterNames });
  layer.setSources(collectSources(document.root));
  runtime.state$.subscribe(layer.setState);

  const view = render(
    <InlineEditContext.Provider value={changeWords}>
      <AppRuntimeContext.Provider value={runtime}>
        <DataLayerContext.Provider value={layer}>
          {framed ? (
            <AppFrame theme={document.theme}>
              <NodeRenderer node={document.root} />
            </AppFrame>
          ) : (
            <NodeRenderer node={document.root} />
          )}
        </DataLayerContext.Provider>
      </AppRuntimeContext.Provider>
    </InlineEditContext.Provider>
  );
  await act(async () => layer.refresh(TEST_CONTEXT));

  return { runtime, layer, ...view };
};
