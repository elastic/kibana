/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BehaviorSubject } from 'rxjs';
import { defaultDoc } from '../mocks/services_mock';
import {
  deserializeState,
  getStructuredDatasourceStates,
  saveUpdatedLinkedAnnotationsToLibrary,
} from './helper';
import { makeEmbeddableServices } from './mocks';
import expect from 'expect';
import type {
  FormBasedPersistedState,
  TextBasedPersistedState,
  DatasourceState,
  StructuredDatasourceStates,
  XYByReferenceAnnotationLayerConfig,
  XYDataLayerConfig,
  XYState,
} from '@kbn/lens-common';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';

describe('Embeddable helpers', () => {
  describe('deserializeState', () => {
    function getServices() {
      return makeEmbeddableServices(new BehaviorSubject<string>(''), undefined, {
        visOverrides: { id: 'lnsXY' },
        dataOverrides: { id: 'form_based' },
      });
    }
    it('should forward a by value raw state', async () => {
      const services = getServices();
      const rawState = {
        attributes: defaultDoc,
      };
      const runtimeState = await deserializeState(services, rawState);
      expect(runtimeState).toEqual(rawState);
    });

    it('should wrap Lens doc/attributes into component state shape', async () => {
      const services = getServices();
      const runtimeState = await deserializeState(services, defaultDoc);
      expect(runtimeState).toEqual(
        expect.objectContaining({
          attributes: { ...defaultDoc, references: defaultDoc.references },
        })
      );
    });

    it('load a by-ref doc from the attribute service', async () => {
      const services = getServices();
      await deserializeState(services, {
        savedObjectId: '123',
      });

      expect(services.attributeService.loadFromLibrary).toHaveBeenCalledWith('123');
    });

    it('should fallback to an empty Lens doc if the saved object is not found', async () => {
      const services = getServices();
      services.attributeService.loadFromLibrary = jest
        .fn()
        .mockRejectedValueOnce(new Error('not found'));
      const runtimeState = await deserializeState(services, {
        savedObjectId: '123',
      });
      // check the visualizationType set to null for empty state
      expect(runtimeState.attributes.visualizationType).toBeNull();
    });
  });

  describe('getStructuredDatasourceStates', () => {
    const formBasedDSStateMock: FormBasedPersistedState = {
      layers: {},
    };
    const textBasedDSStateMock: TextBasedPersistedState = {
      layers: {},
    };

    it('should return structured datasourceStates from unknown datasourceStates', () => {
      const mockDatasourceStates: Record<string, unknown> = {
        formBased: formBasedDSStateMock,
        textBased: textBasedDSStateMock,
        other: textBasedDSStateMock,
      };
      const result = getStructuredDatasourceStates(mockDatasourceStates);

      expect(result.formBased).toEqual(formBasedDSStateMock);
      expect(result.textBased).toEqual(textBasedDSStateMock);
      expect('other' in result).toBe(false);
    });

    it('should return structured datasourceStates from nested unknown datasourceStates', () => {
      const wrap = (ds: unknown) => ({ state: ds, isLoading: false } satisfies DatasourceState);
      const mockDatasourceStates: Record<string, unknown> = {
        formBased: wrap(formBasedDSStateMock),
        textBased: wrap(textBasedDSStateMock),
        other: wrap(textBasedDSStateMock),
      };
      const result = getStructuredDatasourceStates(mockDatasourceStates);

      expect(result.formBased).toEqual(formBasedDSStateMock);
      expect(result.textBased).toEqual(textBasedDSStateMock);
      expect('other' in result).toBe(false);
    });

    it('should return structured datasourceStates from structured datasourceStates', () => {
      const mockDatasourceStates: StructuredDatasourceStates = {
        formBased: formBasedDSStateMock,
        textBased: textBasedDSStateMock,
      };
      const result = getStructuredDatasourceStates(mockDatasourceStates);

      expect(result.formBased).toEqual(formBasedDSStateMock);
      expect(result.textBased).toEqual(textBasedDSStateMock);
    });
  });

  describe('saveUpdatedLinkedAnnotationsToLibrary', () => {
    const mockEventAnnotationService = {
      updateAnnotationGroup: jest.fn(() => Promise.resolve()),
    } as Partial<EventAnnotationServiceType> as EventAnnotationServiceType;

    const baseAnnotation = {
      id: 'ann-1',
      type: 'manual' as const,
      key: { type: 'point_in_time' as const, timestamp: '2025-01-01T00:00:00.000Z' },
      label: 'Event',
      color: '#FF0000',
    };

    const lastSavedConfig = {
      annotations: [{ ...baseAnnotation, color: '#0000FF' }],
      indexPatternId: 'idx-1',
      ignoreGlobalFilters: false,
      title: 'Test Group',
      description: '',
      tags: [],
    };

    function makeByRefLayer(
      overrides?: Partial<XYByReferenceAnnotationLayerConfig>
    ): XYByReferenceAnnotationLayerConfig {
      return {
        layerId: 'layer-1',
        layerType: 'annotations',
        annotations: [baseAnnotation],
        indexPatternId: 'idx-1',
        ignoreGlobalFilters: false,
        annotationGroupId: 'group-1',
        __lastSaved: lastSavedConfig,
        ...overrides,
      };
    }

    function makeVizState(layers: XYState['layers']): XYState {
      return {
        preferredSeriesType: 'bar_stacked',
        legend: { isVisible: true, position: 'right' },
        layers,
      } as XYState;
    }

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle frozen (immutable) visualization state without throwing', async () => {
      const byRefLayer = makeByRefLayer();
      const vizState = makeVizState([byRefLayer]);

      // Simulate immer/Redux frozen state
      const frozenVizState = deepFreeze(vizState);

      await expect(
        saveUpdatedLinkedAnnotationsToLibrary(frozenVizState, mockEventAnnotationService)
      ).resolves.not.toThrow();

      expect(mockEventAnnotationService.updateAnnotationGroup).toHaveBeenCalledTimes(1);
    });

    it('should save modified by-reference annotation layers to the library', async () => {
      const byRefLayer = makeByRefLayer();
      const vizState = makeVizState([byRefLayer]);

      await saveUpdatedLinkedAnnotationsToLibrary(vizState, mockEventAnnotationService);

      expect(mockEventAnnotationService.updateAnnotationGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          annotations: byRefLayer.annotations,
          indexPatternId: byRefLayer.indexPatternId,
          title: lastSavedConfig.title,
        }),
        'group-1'
      );
    });

    it('should skip layers that have no unsaved changes', async () => {
      const unchangedLayer = makeByRefLayer({
        annotations: lastSavedConfig.annotations,
      });
      const vizState = makeVizState([unchangedLayer]);

      await saveUpdatedLinkedAnnotationsToLibrary(vizState, mockEventAnnotationService);

      expect(mockEventAnnotationService.updateAnnotationGroup).not.toHaveBeenCalled();
    });

    it('should skip non-annotation layers', async () => {
      const dataLayer: XYDataLayerConfig = {
        layerId: 'data-layer',
        layerType: 'data',
        seriesType: 'bar',
        accessors: ['col-1'],
      } as XYDataLayerConfig;
      const vizState = makeVizState([dataLayer]);

      await saveUpdatedLinkedAnnotationsToLibrary(vizState, mockEventAnnotationService);

      expect(mockEventAnnotationService.updateAnnotationGroup).not.toHaveBeenCalled();
    });

    it('should return updated viz state with synced __lastSaved', async () => {
      const byRefLayer = makeByRefLayer();
      const vizState = makeVizState([byRefLayer]);

      const result = await saveUpdatedLinkedAnnotationsToLibrary(
        vizState,
        mockEventAnnotationService
      );

      const updatedLayer = (result as XYState).layers[0] as XYByReferenceAnnotationLayerConfig;
      expect(updatedLayer.__lastSaved.annotations).toEqual(byRefLayer.annotations);
    });

    it('should propagate errors from updateAnnotationGroup (e.g. deleted group)', async () => {
      const failingService = {
        updateAnnotationGroup: jest.fn(() => Promise.reject(new Error('Not Found'))),
      } as Partial<EventAnnotationServiceType> as EventAnnotationServiceType;

      const byRefLayer = makeByRefLayer();
      const vizState = makeVizState([byRefLayer]);

      await expect(saveUpdatedLinkedAnnotationsToLibrary(vizState, failingService)).rejects.toThrow(
        'Not Found'
      );
    });
  });
});

function deepFreeze<T extends object>(obj: T): T {
  Object.freeze(obj);
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}
