/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { faker } from '@faker-js/faker';
import type { LensRuntimeState, VisualizationContext } from '../types';
import { initializeActionApi } from './initialize_actions';
import {
  getLensApiMock,
  makeEmbeddableServices,
  getLensRuntimeStateMock,
  createUnifiedSearchApi,
  getLensInternalApiMock,
} from '../mocks';
import { createEmptyLensState } from '../helper';
const DATAVIEW_ID = 'myDataView';

jest.mock('../../app_plugin/show_underlying_data', () => {
  return {
    ...jest.requireActual('../../app_plugin/show_underlying_data'),
    getLayerMetaInfo: jest.fn(() => ({
      meta: {
        id: DATAVIEW_ID,
        columns: ['a', 'b'],
        filters: { disabled: [], enabled: [] },
      },
      error: undefined,
      isVisible: true,
    })),
  };
});

function setupActionsApi(
  stateOverrides?: Partial<LensRuntimeState>,
  contextOverrides?: Omit<VisualizationContext, 'doc'>
) {
  const services = makeEmbeddableServices(undefined, undefined, {
    visOverrides: { id: 'lnsXY' },
    dataOverrides: { id: 'formBased' },
  });
  const uuid = faker.string.uuid();
  const runtimeState = getLensRuntimeStateMock(stateOverrides);
  const apiMock = getLensApiMock();
  // create the internal API and customize internal state
  const internalApi = getLensInternalApiMock();
  internalApi.updateVisualizationContext({
    ...contextOverrides,
    activeAttributes: runtimeState.attributes,
  });

  const { api } = initializeActionApi(
    uuid,
    runtimeState,
    () => runtimeState,
    createUnifiedSearchApi(),
    pick(apiMock, ['timeRange$']),
    pick(apiMock, ['panelTitle']),
    internalApi,
    {
      ...services,
      data: {
        ...services.data,
        nowProvider: { ...services.data.nowProvider, get: jest.fn(() => new Date()) },
      },
    }
  );
  return api;
}

describe('Dashboard actions', () => {
  describe('Drilldowns', () => {
    it('should expose drilldowns for DSL based visualization', async () => {
      const api = setupActionsApi();
      expect(api.enhancements).toBeDefined();
    });

    it('should not expose drilldowns for ES|QL chart types', async () => {
      const api = setupActionsApi(
        createEmptyLensState('lnsXY', faker.lorem.words(), faker.lorem.text(), {
          esql: 'FROM index',
        })
      );
      expect(api.enhancements).toBeUndefined();
    });
  });

  describe('Explore in Discover', () => {
    // make it pass the basic check on viewUnderlyingData
    const visualizationContextMockOverrides = {
      activeAttributes: undefined,
      mergedSearchContext: {},
      indexPatterns: {
        [DATAVIEW_ID]: {
          id: DATAVIEW_ID,
          title: 'idx1',
          timeFieldName: 'timestamp',
          hasRestrictions: false,
          fields: [
            {
              name: 'timestamp',
              displayName: 'timestampLabel',
              type: 'date',
              aggregatable: true,
              searchable: true,
            },
          ],
          getFieldByName: jest.fn(),
          getFormatterForField: jest.fn(),
          isPersisted: true,
          spec: {},
        },
      },
      indexPatternRefs: [],
      activeVisualizationState: {},
      activeDatasourceState: {},
      activeData: {},
    };
    it('should expose the "explore in discover" capability for DSL based visualization when compatible', async () => {
      const api = setupActionsApi(undefined, visualizationContextMockOverrides);
      api.loadViewUnderlyingData();
      expect(api.canViewUnderlyingData$.getValue()).toBe(true);
    });

    it('should expose the "explore in discover" capability for ES|QL chart types', async () => {
      const api = setupActionsApi(
        createEmptyLensState('lnsXY', faker.lorem.words(), faker.lorem.text(), {
          esql: 'FROM index',
        }),
        visualizationContextMockOverrides
      );
      api.loadViewUnderlyingData();
      expect(api.canViewUnderlyingData$.getValue()).toBe(true);
    });
  });
});
