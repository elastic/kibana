/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  makeDefaultServices,
  makeLensStore,
  defaultDoc,
  createMockVisualization,
  createMockDatasource,
  mockStoreDeps,
  exactMatchDoc,
} from '../mocks';
import { Location, History } from 'history';
import { act } from 'react-dom/test-utils';
import { InitialAppState, loadInitial } from './lens_slice';
import { Filter } from '@kbn/es-query';
import { faker } from '@faker-js/faker';
import { DOC_TYPE } from '../../common/constants';

const history = {
  location: {
    search: '?search',
  } as Location,
} as History;

const defaultSavedObjectId = '1234';
const preloadedState = {
  isLoading: true,
  visualization: {
    state: null,
    activeId: 'testVis',
  },
};

const defaultProps: InitialAppState = {
  redirectCallback: jest.fn(),
  initialInput: { savedObjectId: defaultSavedObjectId },
  history,
};

/**
 * This is just a convenience wrapper around act & dispatch
 * The loadInitial action is hijacked by a custom middleware which returns a Promise
 * therefore we need to await before proceeding with all the checks
 * The intent of this wrapper is to avoid confusion with this specific action
 */
async function loadInitialAppState(
  store: ReturnType<typeof makeLensStore>['store'],
  initialState: InitialAppState
) {
  await act(async () => {
    await store.dispatch(loadInitial(initialState));
  });
}

describe('Initializing the store', () => {
  it('should initialize initial datasource', async () => {
    const { store, deps } = makeLensStore({ preloadedState });
    await loadInitialAppState(store, defaultProps);
    expect(deps.datasourceMap.testDatasource.initialize).toHaveBeenCalled();
  });

  it('should have initialized the initial datasource and visualization', async () => {
    const { store, deps } = makeLensStore({ preloadedState });
    await loadInitialAppState(store, { ...defaultProps, initialInput: undefined });
    expect(deps.datasourceMap.testDatasource.initialize).toHaveBeenCalled();
    expect(deps.datasourceMap.testDatasource2.initialize).not.toHaveBeenCalled();
    expect(deps.visualizationMap.testVis.initialize).toHaveBeenCalled();
    expect(deps.visualizationMap.testVis2.initialize).not.toHaveBeenCalled();
  });

  it('should initialize all datasources with state from doc', async () => {
    const datasource1State = { datasource1: '' };
    const datasource2State = { datasource2: '' };
    const services = makeDefaultServices();
    services.attributeService.loadFromLibrary = jest.fn().mockResolvedValue({
      attributes: {
        exactMatchDoc,
        visualizationType: 'testVis',
        title: '',
        state: {
          datasourceStates: {
            testDatasource: datasource1State,
            testDatasource2: datasource2State,
          },
          visualization: {},
          query: { query: '', language: 'lucene' },
          filters: [],
        },
        references: [],
      },
    });

    const storeDeps = mockStoreDeps({
      lensServices: services,
      visualizationMap: {
        testVis: {
          ...createMockVisualization(),
          id: 'testVis',
          visualizationTypes: [
            {
              icon: 'empty',
              id: 'testVis',
              label: faker.lorem.word(),
              sortPriority: 1,
              description: faker.lorem.sentence(),
            },
          ],
        },
      },
      datasourceMap: {
        testDatasource: createMockDatasource('testDatasource'),
        testDatasource2: createMockDatasource('testDatasource2'),
        testDatasource3: createMockDatasource('testDatasource3'),
      },
    });

    const { store, deps } = makeLensStore({
      storeDeps,
      preloadedState,
    });

    await loadInitialAppState(store, defaultProps);
    const { datasourceMap } = deps;

    expect(datasourceMap.testDatasource.initialize).toHaveBeenCalledWith(
      datasource1State,
      [],
      undefined,
      [],
      {}
    );
    expect(datasourceMap.testDatasource2.initialize).toHaveBeenCalledWith(
      datasource2State,
      [],
      undefined,
      [],
      {}
    );
    expect(datasourceMap.testDatasource3.initialize).not.toHaveBeenCalled();
    expect(store.getState()).toMatchSnapshot();
  });

  describe('loadInitial', () => {
    it('does not load a document if there is no initial input', async () => {
      const { deps, store } = makeLensStore({ preloadedState });
      await loadInitialAppState(store, {
        ...defaultProps,
        initialInput: undefined,
      });

      expect(deps.lensServices.attributeService.loadFromLibrary).not.toHaveBeenCalled();
    });

    it('starts new searchSessionId', async () => {
      const { store } = makeLensStore({ preloadedState });
      await loadInitialAppState(store, { ...defaultProps, initialInput: undefined });
      expect(store.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: 'sessionId-1',
        }),
      });
    });

    it('cleans datasource and visualization state properly when reloading', async () => {
      const { store, deps } = makeLensStore({
        preloadedState: {
          ...preloadedState,
          visualization: {
            activeId: 'testVis',
            state: {},
          },
          datasourceStates: { testDatasource: { isLoading: false, state: {} } },
        },
      });

      expect(store.getState()).toEqual({
        lens: expect.objectContaining({
          visualization: {
            activeId: 'testVis',
            state: {},
          },
          activeDatasourceId: 'testDatasource',
          datasourceStates: {
            testDatasource: { isLoading: false, state: {} },
          },
        }),
      });

      await loadInitialAppState(store, {
        ...defaultProps,
        initialInput: undefined,
      });

      expect(deps.visualizationMap.testVis.initialize).toHaveBeenCalled();
      expect(store.getState()).toEqual({
        lens: expect.objectContaining({
          visualization: {
            state: 'testVis initial state', // new vis gets initialized
            activeId: 'testVis',
          },
          activeDatasourceId: 'testDatasource2', // resets to first on the list
          datasourceStates: {
            testDatasource: { isLoading: false, state: undefined }, // state resets to undefined
            testDatasource2: {
              state: {}, // initializes first in the map
            },
          },
        }),
      });
    });

    it('loads a document and uses query and filters if initial input is provided', async () => {
      const { store, deps } = makeLensStore({ preloadedState });

      const mockFilters = faker.lorem.words(3).split(' ') as unknown as Filter[];

      jest
        .spyOn(deps.lensServices.data.query.filterManager, 'getFilters')
        .mockReturnValue(mockFilters);

      await loadInitialAppState(store, defaultProps);

      expect(deps.lensServices.attributeService.loadFromLibrary).toHaveBeenCalledWith(
        defaultSavedObjectId
      );

      expect(deps.lensServices.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([
        { query: { match_phrase: { src: 'test' } }, meta: { index: 'injected!' } },
      ]);

      expect(store.getState()).toEqual({
        lens: expect.objectContaining({
          persistedDoc: { ...defaultDoc, type: DOC_TYPE },
          query: defaultDoc.state.query,
          isLoading: false,
          activeDatasourceId: 'testDatasource',
          filters: mockFilters,
        }),
      });
    });

    it('does not load documents on sequential renders unless the id changes', async () => {
      const { store, deps } = makeLensStore({ preloadedState });

      await loadInitialAppState(store, defaultProps);

      await loadInitialAppState(store, defaultProps);

      expect(deps.lensServices.attributeService.loadFromLibrary).toHaveBeenCalledTimes(1);

      await loadInitialAppState(store, {
        ...defaultProps,
        initialInput: { savedObjectId: '5678' },
      });

      expect(deps.lensServices.attributeService.loadFromLibrary).toHaveBeenCalledTimes(2);
    });

    it('handles document load errors', async () => {
      const { store, deps } = makeLensStore({ preloadedState });

      deps.lensServices.attributeService.loadFromLibrary = jest
        .fn()
        .mockRejectedValue('failed to load');
      const redirectCallback = jest.fn();
      await loadInitialAppState(store, { ...defaultProps, redirectCallback });

      expect(deps.lensServices.attributeService.loadFromLibrary).toHaveBeenCalledWith(
        defaultSavedObjectId
      );
      expect(deps.lensServices.notifications.toasts.addDanger).toHaveBeenCalled();
      expect(redirectCallback).toHaveBeenCalled();
    });

    it('redirects if saved object is an aliasMatch', async () => {
      const { store, deps } = makeLensStore({ preloadedState });
      deps.lensServices.attributeService.loadFromLibrary = jest.fn().mockResolvedValue({
        attributes: {
          ...defaultDoc,
        },
        sharingSavedObjectProps: {
          outcome: 'aliasMatch',
          aliasTargetId: 'id2',
          aliasPurpose: 'savedObjectConversion',
        },
      });

      await loadInitialAppState(store, defaultProps);

      expect(deps.lensServices.attributeService.loadFromLibrary).toHaveBeenCalledWith(
        defaultSavedObjectId
      );
      expect(deps.lensServices.spaces?.ui.redirectLegacyUrl).toHaveBeenCalledWith({
        path: '#/edit/id2?search',
        aliasPurpose: 'savedObjectConversion',
        objectNoun: 'Lens visualization',
      });
    });

    it('adds to the recently accessed list on load', async () => {
      const { store, deps } = makeLensStore({ preloadedState });
      await loadInitialAppState(store, defaultProps);

      expect(deps.lensServices.chrome.recentlyAccessed.add).toHaveBeenCalledWith(
        '/app/lens#/edit/1234',
        'An extremely cool default document!',
        '1234'
      );
    });
  });
});
