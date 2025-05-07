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
import { FormBasedPersistedState } from '../datasources/form_based/types';
import { TextBasedPersistedState } from '../datasources/form_based/esql_layer/types';
import expect from 'expect';
import { DatasourceState } from '../state_management';
import { StructuredDatasourceStates } from './types';

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

    describe('injected references should overwrite inner ones', () => {
      // There are 3 possible scenarios here for reference injections:
      // * default space for a by-value
      // * default space for a by-ref with a "lens" panel reference type
      // * other space for a by-value with new ref ids

      it('should inject correctly serialized references into runtime state for a by value in the default space', async () => {
        const services = getServices();
        const mockedReferences = [
          { id: 'serializedRefs', name: 'index-pattern-0', type: 'mocked-reference' },
        ];
        const runtimeState = await deserializeState(
          services,
          {
            attributes: defaultDoc,
          },
          mockedReferences
        );
        expect(services.attributeService.injectReferences).toHaveBeenCalled();
        expect(runtimeState.attributes.references).toEqual(mockedReferences);
      });

      it('should inject correctly serialized references into runtime state for a by ref in the default space', async () => {
        const services = getServices();
        const mockedReferences = [
          { id: 'serializedRefs', name: 'index-pattern-0', type: 'mocked-reference' },
        ];
        const runtimeState = await deserializeState(
          services,
          {
            savedObjectId: '123',
          },
          mockedReferences
        );
        expect(services.attributeService.injectReferences).not.toHaveBeenCalled();
        // Note the original references should be kept
        expect(runtimeState.attributes.references).toEqual(defaultDoc.references);
      });

      it('should inject correctly serialized references into runtime state for a by value in another space', async () => {
        const services = getServices();
        const mockedReferences = [
          { id: 'serializedRefs', name: 'index-pattern-0', type: 'mocked-reference' },
        ];
        const runtimeState = await deserializeState(
          services,
          {
            attributes: defaultDoc,
          },
          mockedReferences
        );
        expect(services.attributeService.injectReferences).toHaveBeenCalled();
        // note: in this case the references are swapped
        expect(runtimeState.attributes.references).toEqual(mockedReferences);
      });
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
