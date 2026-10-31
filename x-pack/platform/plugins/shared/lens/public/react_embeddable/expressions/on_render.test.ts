/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetStateType, LensInternalApi } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';
import type { LensEmbeddableStartServices } from '../types';
import { prepareOnRender } from './on_render';

jest.mock('../../lens_ui_telemetry', () => ({
  getExecutionContextEvents: jest.fn(() => []),
  trackUiCounterEvents: jest.fn(),
}));

jest.mock('../../report_performance_metric_util', () => ({
  getSuccessfulRequestTimings: jest.fn(() => undefined),
}));

const mockTrackUiCounterEvents = trackUiCounterEvents as jest.MockedFunction<
  typeof trackUiCounterEvents
>;

const esqlLayer = {
  index: 'esql-id',
  query: { esql: 'FROM logs-*' },
  columns: [],
  timeField: '@timestamp',
};

const render = (state: Record<string, unknown>) => {
  const getState = jest.fn(() => ({
    attributes: {
      references: [],
      state: { datasourceStates: {}, ...state },
    },
  })) as unknown as GetStateType;
  const internalApi = { renderCount$: { getValue: () => 0 } } as unknown as LensInternalApi;
  const api = { getInspectorAdapters: () => ({}) } as unknown as LensApi;

  prepareOnRender(
    api,
    internalApi,
    undefined,
    getState,
    {
      datasourceMap: {},
      visualizationMap: {},
      coreStart: {},
    } as unknown as LensEmbeddableStartServices,
    undefined,
    jest.fn()
  )(1);

  return mockTrackUiCounterEvents.mock.calls[0][0];
};

describe('prepareOnRender', () => {
  beforeEach(() => {
    mockTrackUiCounterEvents.mockClear();
  });

  it('counts the persisted ad hoc data views', () => {
    const events = render({
      adHocDataViews: { a: { id: 'a', title: 'a-*' }, b: { id: 'b', title: 'b-*' } },
    });

    expect(events).toEqual(['ad_hoc_data_view', 'ad_hoc_data_view']);
  });

  it('counts the ad hoc data view of an ES|QL layer that has no persisted spec', () => {
    const events = render({
      adHocDataViews: {},
      datasourceStates: { textBased: { layers: { layer1: esqlLayer } } },
    });

    expect(events).toEqual(['ad_hoc_data_view']);
  });

  it('counts the persisted spec of an ES|QL layer once', () => {
    const events = render({
      adHocDataViews: { 'esql-id': { id: 'esql-id', title: 'logs-*', type: 'esql' } },
      datasourceStates: { textBased: { layers: { layer1: esqlLayer } } },
    });

    expect(events).toEqual(['ad_hoc_data_view']);
  });
});
