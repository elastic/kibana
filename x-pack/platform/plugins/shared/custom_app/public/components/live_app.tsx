/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
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
import { AppRuntimeContext } from '../runtime/app_runtime_context';
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
}

/**
 * The app, live, outside a dashboard: on its own page, or in a chat card. With no dashboard around
 * it, it has its own period, the last day to begin with, which a Time range component in the app
 * changes; an app without one keeps it. It has its own state too: what is picked here stays here.
 */
export const LiveApp = ({ document, appId }: LiveAppProps) => {
  const { core, search } = getServices();
  const [timeRange, setTimeRange] = useState(DEFAULT_TIME_RANGE);

  const { runtime, dataLayer } = useMemo(() => {
    const layer = createDataLayer({
      runQuery: createRunEsqlQuery({ search, http: core.http }),
      runCases: createRunCases({ http: core.http }),
      getParameterNames: (query) => getESQLQueryVariables(query),
    });
    layer.setSources(collectSources(document.root));
    const appRuntime = createAppRuntime(document);
    // Emits the defaults straight away, then every change made in the card.
    appRuntime.state$.subscribe(layer.setState);
    return { runtime: appRuntime, dataLayer: layer };
  }, [core.http, document, search]);

  // Subscribed after the nodes have declared what they read, so the first fetch finds them.
  useEffect(() => {
    dataLayer.refresh(toFetchContext(timeRange));
  }, [dataLayer, timeRange]);

  useEffect(() => () => dataLayer.destroy(), [dataLayer]);

  const timeRangeControl = useMemo(() => ({ setTimeRange }), []);

  return (
    <div data-test-subj="customAppChatCard">
      <AppRuntimeContext.Provider value={runtime}>
        <TimeRangeControlContext.Provider value={timeRangeControl}>
          <WorkflowRunnerProvider appId={appId}>
            <DataLayerContext.Provider value={dataLayer}>
              <AppFrame>
                <NodeRenderer node={document.root} />
              </AppFrame>
            </DataLayerContext.Provider>
          </WorkflowRunnerProvider>
        </TimeRangeControlContext.Provider>
      </AppRuntimeContext.Provider>
    </div>
  );
};
