/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { combineLatest } from 'rxjs';
import type { FetchContext } from '@kbn/presentation-publishing';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { collectSources, type AppDocument } from '@kbn/custom-app-common';
import { AppFrame } from './app_frame';
import { NodeRenderer } from './node_renderer';
import { createDataLayer } from '../data/data_layer';
import { DataLayerContext } from '../data/data_layer_context';
import { createRunCases } from '../data/run_cases';
import { createRunEsqlQuery } from '../data/run_esql_query';
import { createAppRuntime } from '../runtime/app_runtime';
import { AppIdContext } from '../runtime/app_id_context';
import { AppRuntimeContext } from '../runtime/app_runtime_context';
import { createView, getViewKeys, isSameView, type ViewState } from '../runtime/view_state';
import { TimeRangeControlContext } from '../runtime/time_range_context';
import { getServices } from '../services';
import { WorkflowRunnerProvider } from '../workflows/workflow_runner';

const DEFAULT_TIME_RANGE = { from: 'now-24h', to: 'now' };

const toFetchContext = (timeRange: { from: string; to: string }): FetchContext => ({
  isReload: false,
  filters: undefined,
  query: undefined,
  searchSessionId: undefined,
  timeRange,
  timeslice: undefined,
  esqlVariables: undefined,
  projectRouting: undefined,
  isApproximate: false,
});

interface LiveAppProps {
  document: AppDocument;
  appId?: string;
  /**
   * How the app is to be seen, when where it is shown keeps that, as a page does in its URL: it is
   * what the app starts as, and what it follows when it changes from outside.
   */
  view?: ViewState;
  /** Told whenever what is seen changes, so that the host can keep it. */
  onViewChange?: (view: ViewState) => void;
}

/**
 * The app, live, outside a dashboard: on its own page, or in a chat card. With no dashboard around
 * it, it has its own period, the last day to begin with, which a Time range component in the app
 * changes; an app without one keeps it. It has its own state too: what is picked here stays here.
 */
export const LiveApp = ({ document, appId, view, onViewChange }: LiveAppProps) => {
  const { core, search } = getServices();
  // Read when the app is made, and not followed: a new document keeps the app as it is seen.
  const viewRef = useRef(view);
  viewRef.current = view;
  const [timeRange, setTimeRange] = useState(view?.timeRange ?? DEFAULT_TIME_RANGE);

  const { runtime, dataLayer } = useMemo(() => {
    const layer = createDataLayer({
      runQuery: createRunEsqlQuery({ search, http: core.http }),
      runCases: createRunCases({ http: core.http }),
      getParameterNames: (query) => getESQLQueryVariables(query),
    });
    layer.setSources(collectSources(document.root));
    const appRuntime = createAppRuntime(document);
    if (viewRef.current) appRuntime.restoreView(viewRef.current, getViewKeys(document));
    // Emits the defaults straight away, then every change made in the card.
    appRuntime.state$.subscribe(layer.setState);
    return { runtime: appRuntime, dataLayer: layer };
  }, [core.http, document, search]);

  // Subscribed after the nodes have declared what they read, so the first fetch finds them.
  useEffect(() => {
    dataLayer.refresh(toFetchContext(timeRange));
  }, [dataLayer, timeRange]);

  useEffect(() => () => dataLayer.destroy(), [dataLayer]);

  // What is seen changed from outside, such as a link that was followed: the app follows it. What
  // it is compared with is read as it is now, and only a change of the view is acted on.
  const current = useRef({ document, runtime, timeRange });
  current.current = { document, runtime, timeRange };
  useEffect(() => {
    if (!view) return;
    const { document: shown, runtime: shownRuntime, timeRange: shownTimeRange } = current.current;
    const seen = createView(
      shown,
      shownRuntime.state$.getValue(),
      shownRuntime.openFlyoutId$.getValue(),
      shownTimeRange,
      DEFAULT_TIME_RANGE
    );
    if (isSameView(seen, view)) return;
    shownRuntime.restoreView(view, getViewKeys(shown));
    setTimeRange(view.timeRange ?? DEFAULT_TIME_RANGE);
  }, [view]);

  // What is seen changed in the app: the host is told, unless it is what the host already has.
  useEffect(() => {
    if (!onViewChange) return;
    const subscription = combineLatest([runtime.state$, runtime.openFlyoutId$]).subscribe(
      ([state, flyout]) => {
        const seen = createView(document, state, flyout, timeRange, DEFAULT_TIME_RANGE);
        if (!viewRef.current || !isSameView(seen, viewRef.current)) onViewChange(seen);
      }
    );
    return () => subscription.unsubscribe();
  }, [document, runtime, timeRange, onViewChange]);

  const timeRangeControl = useMemo(() => ({ setTimeRange }), []);

  return (
    <div data-test-subj="customAppChatCard">
      <AppIdContext.Provider value={appId}>
        <AppRuntimeContext.Provider value={runtime}>
          <TimeRangeControlContext.Provider value={timeRangeControl}>
            <WorkflowRunnerProvider appId={appId}>
              <DataLayerContext.Provider value={dataLayer}>
                <AppFrame theme={document.theme}>
                  <NodeRenderer node={document.root} />
                </AppFrame>
              </DataLayerContext.Provider>
            </WorkflowRunnerProvider>
          </TimeRangeControlContext.Provider>
        </AppRuntimeContext.Provider>
      </AppIdContext.Provider>
    </div>
  );
};
