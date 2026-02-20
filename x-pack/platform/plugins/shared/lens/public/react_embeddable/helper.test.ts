/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BehaviorSubject } from 'rxjs';
import { defaultDoc } from '../mocks/services_mock';
import { deserializeState, getStructuredDatasourceStates } from './helper';
import { makeEmbeddableServices } from './mocks';
import expect from 'expect';
import type {
  FormBasedPersistedState,
  TextBasedPersistedState,
  DatasourceState,
  StructuredDatasourceStates,
} from '@kbn/lens-common';

describe('Embeddable helpers', () => {
  describe('deserializeState', () => {
    function getServices() {
      return makeEmbeddableServices(new BehaviorSubject<string>(''), undefined, {
        visOverrides: { id: 'lnsXY' },
        dataOverrides: { id: 'formBased' },
      });
    }
    it('should forward a by value state', async () => {
      const services = getServices();
      const initialState = {
        attributes: defaultDoc,
      };
      const runtimeState = await deserializeState(services, initialState);
      expect(runtimeState).toEqual(initialState);
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
});
