/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  type OnTimeChangeProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FetchContext } from '@kbn/presentation-publishing';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { collectQueries, type AppDocument } from '@kbn/custom-app-common';
import { AppFrame } from './app_frame';
import { NodeRenderer } from './node_renderer';
import { createDataLayer } from '../data/data_layer';
import { DataLayerContext } from '../data/data_layer_context';
import { createRunEsqlQuery } from '../data/run_esql_query';
import { createAppRuntime } from '../runtime/app_runtime';
import { AppRuntimeContext } from '../runtime/app_runtime_context';
import { getServices } from '../services';

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

/**
 * The app, live, inside the conversation. It has its own time range, since there is no dashboard
 * around it, and its own state: what is picked here stays here.
 */
export const LiveApp = ({ document }: { document: AppDocument }) => {
  const { core, search } = getServices();
  const [timeRange, setTimeRange] = useState(DEFAULT_TIME_RANGE);

  const { runtime, dataLayer } = useMemo(() => {
    const layer = createDataLayer({
      runQuery: createRunEsqlQuery({ search, http: core.http }),
      getParameterNames: (query) => getESQLQueryVariables(query),
    });
    layer.setQueries(collectQueries(document.root));
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

  const onTimeChange = useCallback(
    ({ start, end }: OnTimeChangeProps) => setTimeRange({ from: start, to: end }),
    []
  );

  return (
    <div data-test-subj="customAppChatCard">
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={timeRange.from}
            end={timeRange.to}
            onTimeChange={onTimeChange}
            showUpdateButton={false}
            compressed
            aria-label={i18n.translate('xpack.customApp.attachment.timeRangeLabel', {
              defaultMessage: 'Time range of the app',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <AppRuntimeContext.Provider value={runtime}>
        <DataLayerContext.Provider value={dataLayer}>
          <AppFrame>
            <NodeRenderer node={document.root} />
          </AppFrame>
        </DataLayerContext.Provider>
      </AppRuntimeContext.Provider>
    </div>
  );
};
