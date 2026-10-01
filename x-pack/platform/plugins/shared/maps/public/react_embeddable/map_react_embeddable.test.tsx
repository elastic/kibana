/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
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

const mockMapContainer = jest.fn();
jest.mock('../connected_components/map_container', () => ({
  MapContainer: (props: Record<string, unknown>) => {
    mockMapContainer(props);
    return (
      <div>
        MockMapContainer
        {/* Mirror the real MapContainer: ToolbarOverlay and RightSideControls are hidden when not interactive */}
        {Boolean(props.isInteractive) && <div data-test-subj="mapToolbarOverlay">Toolbar</div>}
        {Boolean(props.isInteractive) && <div data-test-subj="mapRightSideControls">Controls</div>}
      </div>
    );
  },
}));

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

  describe('isInteractive', () => {
    it('passes isInteractive=false to MapContainer when viewMode is non-interactive', (done) => {
      const viewMode$ = new BehaviorSubject<'non-interactive'>('non-interactive');
      const parentApi = { viewMode$ };
      const uuid = 'preview-map-1';
      const finalizeApi = (api: any) => ({
        ...api,
        uuid,
        parent: parentApi,
        type: MAP_SAVED_OBJECT_TYPE,
        phase$: new BehaviorSubject(undefined),
      });

      mapEmbeddableFactory
        .buildEmbeddable({
          initializeDrilldownsManager,
          initialState: { attributes: { title: 'preview map' } },
          finalizeApi,
          uuid,
          parentApi,
        })
        .then(({ Component }) => {
          mockMapContainer.mockClear();
          render(<Component />);
          const lastProps = mockMapContainer.mock.calls.at(-1)?.[0];
          expect(lastProps?.isInteractive).toBe(false);
          done();
        })
        .catch(done);
    });

    it('shows toolbar and controls when interactive', (done) => {
      const viewMode$ = new BehaviorSubject<'view'>('view');
      const parentApi = { viewMode$ };
      const uuid = 'view-map-toolbar';
      const finalizeApi = (api: any) => ({
        ...api,
        uuid,
        parent: parentApi,
        type: MAP_SAVED_OBJECT_TYPE,
        phase$: new BehaviorSubject(undefined),
      });

      mapEmbeddableFactory
        .buildEmbeddable({
          initializeDrilldownsManager,
          initialState: { attributes: { title: 'view map toolbar test' } },
          finalizeApi,
          uuid,
          parentApi,
        })
        .then(({ Component }) => {
          const { queryByTestId } = render(<Component />);
          expect(queryByTestId('mapToolbarOverlay')).toBeInTheDocument();
          expect(queryByTestId('mapRightSideControls')).toBeInTheDocument();
          done();
        })
        .catch(done);
    });

    it('hides toolbar and controls when not interactive', (done) => {
      const viewMode$ = new BehaviorSubject<'non-interactive'>('non-interactive');
      const parentApi = { viewMode$ };
      const uuid = 'preview-map-toolbar';
      const finalizeApi = (api: any) => ({
        ...api,
        uuid,
        parent: parentApi,
        type: MAP_SAVED_OBJECT_TYPE,
        phase$: new BehaviorSubject(undefined),
      });

      mapEmbeddableFactory
        .buildEmbeddable({
          initializeDrilldownsManager,
          initialState: { attributes: { title: 'preview map toolbar test' } },
          finalizeApi,
          uuid,
          parentApi,
        })
        .then(({ Component }) => {
          const { queryByTestId } = render(<Component />);
          expect(queryByTestId('mapToolbarOverlay')).not.toBeInTheDocument();
          expect(queryByTestId('mapRightSideControls')).not.toBeInTheDocument();
          done();
        })
        .catch(done);
    });
  });
});
