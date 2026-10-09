/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { initializeDrilldownsManager } from '@kbn/embeddable-plugin/public/drilldowns/drilldowns_manager';
import { BehaviorSubject } from 'rxjs';
import type { MapApi } from './types';
import { MAP_SAVED_OBJECT_TYPE } from '../../common';
import { mapEmbeddableFactory } from './map_react_embeddable';

jest.mock('../kibana_services', () => {
  return {
    getMapsCapabilities() {
      return { save: true };
    },
    getShowMapsInspectorAdapter() {
      return false;
    },
    getEMSSettings() {
      return {
        isEMSEnabled: () => {
          return false;
        },
        isEMSUrlSet() {
          return false;
        },
      };
    },
    getExecutionContextService: () => ({
      get: () => undefined,
    }),
    getSpacesApi: () => undefined,
    getMapsEmsStart: () => ({
      config: {},
    }),
    getTimeFilter: () => ({
      getTime: () => ({ from: 'now-15m', to: 'now' }),
      getRefreshInterval: () => undefined,
    }),
    getUsageCollection: () => {
      return {
        reportUiCounter: () => {},
      };
    },
  };
});

jest.mock('../connected_components/map_container', () => {
  return () => <div>MockMapContainer</div>;
});

jest.mock('../licensed_features', () => {
  return {
    whenLicenseInitialized: jest.fn().mockResolvedValue(undefined),
  };
});

describe('map embeddable', () => {
  let embeddableApi: MapApi;
  beforeEach((done) => {
    const parent = {};
    const uuid = '1';
    const finalizeApi = (api: any) => ({
      ...api,
      uuid,
      parent,
      type: MAP_SAVED_OBJECT_TYPE,
      phase$: new BehaviorSubject(undefined),
    });
    mapEmbeddableFactory
      .buildEmbeddable({
        initializeDrilldownsManager,
        initialState: {
          attributes: {
            title: 'my map',
          },
        },
        finalizeApi,
        uuid: '1',
        parentApi: {},
      })
      .then(({ api }) => {
        embeddableApi = api;
        done();
      })
      .catch(done);
  });

  describe('anyStateChange$', () => {
    test('should not emit on subscribe and emit when any state changes', (done) => {
      embeddableApi.anyStateChange$.subscribe(() => {
        try {
          const { title } = embeddableApi.serializeState();
          expect(title).toBe('cute puppies');
        } catch (error) {
          // title assertion fails when
          // anyStateChange$ emits on subscribe
          done(error);
          return;
        }
        done();
      });
      embeddableApi.setTitle('cute puppies');
    });
  });
});
