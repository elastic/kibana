/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { canTrackContentfulRender } from '@kbn/presentation-publishing';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { GetStateType, LensInternalApi, TableInspectorAdapter } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';

import { getExecutionContextEvents, trackUiCounterEvents } from '../../lens_ui_telemetry';
import type { LensEmbeddableStartServices } from '../types';
import { getSuccessfulRequestTimings } from '../../report_performance_metric_util';
import { addLog } from '../logger';

function trackContentfulRender(activeData: TableInspectorAdapter, parentApi: unknown) {
  if (!canTrackContentfulRender(parentApi)) {
    return;
  }

  const hasData = Object.values(activeData).some((table) => {
    if (table.meta?.statistics?.totalCount != null) {
      // if totalCount is set, refer to total count
      return table.meta.statistics.totalCount > 0;
    }
    // if not, fall back to check the rows of the table
    return table.rows.length > 0;
  });

  if (hasData) {
    parentApi.trackContentfulRender();
  }
}

function trackPerformanceMetrics(
  api: LensApi,
  coreStart: LensEmbeddableStartServices['coreStart']
) {
  const inspectorAdapters = api.getInspectorAdapters();
  const timings = getSuccessfulRequestTimings(inspectorAdapters);
  if (timings) {
    const esRequestMetrics = {
      eventName: 'lens_chart_es_request_totals',
      duration: timings.requestTimeTotal,
      key1: 'es_took_total',
      value1: timings.esTookTotal,
    };
    reportPerformanceMetricEvent(coreStart.analytics, esRequestMetrics);
  }
}

export function prepareOnRender(
  api: LensApi,
  internalApi: LensInternalApi,
  parentApi: unknown,
  getState: GetStateType,
  { datasourceMap, visualizationMap, coreStart }: LensEmbeddableStartServices,
  executionContext: KibanaExecutionContext | undefined,
  dispatchRenderComplete: () => void
) {
  return function onRender$(count: number) {
    addLog(`onRender$ ${count}`);
    // for some reason onRender$ is emitting multiple times with the same render count
    // so avoid to repeat the same logic on duplicate calls
    if (count === internalApi.renderCount$.getValue()) {
      return;
    }
    let datasourceEvents: string[] = [];
    let visualizationEvents: string[] = [];
    const currentState = getState();

    if (currentState) {
      datasourceEvents = Object.values(datasourceMap).reduce<string[]>(
        (acc, datasource) => [
          ...acc,
          ...(datasource.getRenderEventCounters?.(
            currentState.attributes.state.datasourceStates[datasource.id]
          ) ?? []),
        ],
        []
      );

      if (currentState.attributes.visualizationType) {
        visualizationEvents =
          visualizationMap[currentState.attributes.visualizationType].getRenderEventCounters?.(
            currentState.attributes.state.visualization
          ) ?? [];
      }
    }

    const events = [
      ...datasourceEvents,
      ...visualizationEvents,
      ...getExecutionContextEvents(executionContext),
    ];

    const adHocDataViews = Object.values(currentState.attributes.state.adHocDataViews || {});
    adHocDataViews.forEach(() => {
      events.push('ad_hoc_data_view');
    });

    trackUiCounterEvents(events, executionContext);

    trackContentfulRender(api.getInspectorAdapters().tables?.tables, parentApi);

    dispatchRenderComplete();

    trackPerformanceMetrics(api, coreStart);
  };
}
