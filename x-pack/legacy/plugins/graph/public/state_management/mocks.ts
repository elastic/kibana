/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Chrome } from 'ui/chrome';
import { IndexPattern } from 'src/legacy/core_plugins/data/public';
import { NotificationsStart, HttpStart } from 'kibana/public';
import createSagaMiddleware from 'redux-saga';
import { createStore, applyMiddleware, AnyAction } from 'redux';
import { GraphStoreDependencies, createRootReducer, GraphStore, GraphState } from './store';
import { Workspace, GraphWorkspaceSavedObject, IndexPatternSavedObject } from '../types';

jest.mock('ui/new_platform');

export interface MockedGraphEnvironment {
  store: GraphStore;
  mockedDeps: jest.Mocked<GraphStoreDependencies>;
}

/**
 * Creates a graph store with original reducers registered but mocked out dependencies.
 * This can be used to test a component in a realistic stateful setting and to test sagas
 * in their natural habitat by passing them in via options in the `sagas` array.
 *
 * The existing mocks are as barebone as possible, if you need specific values to be returned
 * from mocked dependencies, you can pass in `mockedDepsOverwrites` via options.
 */
export function createMockGraphStore({
  sagas = [],
  mockedDepsOverwrites = {},
  initialStateOverwrites,
}: {
  sagas?: Array<(deps: GraphStoreDependencies) => () => Iterator<unknown>>;
  mockedDepsOverwrites?: Partial<jest.Mocked<GraphStoreDependencies>>;
  initialStateOverwrites?: Partial<GraphState>;
}): MockedGraphEnvironment {
  const workspaceMock = ({
    runLayout: jest.fn(),
    nodes: [],
    edges: [],
    options: {},
    blacklistedNodes: [],
  } as unknown) as Workspace;

  const savedWorkspace = ({
    save: jest.fn(),
  } as unknown) as GraphWorkspaceSavedObject;

  const mockedDeps: jest.Mocked<GraphStoreDependencies> = {
    basePath: 'basepath',
    changeUrl: jest.fn(),
    chrome: ({
      breadcrumbs: {
        set: jest.fn(),
      },
    } as unknown) as Chrome,
    createWorkspace: jest.fn(),
    getWorkspace: jest.fn(() => workspaceMock),
    getSavedWorkspace: jest.fn(() => savedWorkspace),
    indexPatternProvider: {
      get: jest.fn(() => Promise.resolve(({} as unknown) as IndexPattern)),
    },
    indexPatterns: [
      ({ id: '123', attributes: { title: 'test-pattern' } } as unknown) as IndexPatternSavedObject,
    ],
    notifications: ({
      toasts: {
        addDanger: jest.fn(),
        addSuccess: jest.fn(),
      },
    } as unknown) as NotificationsStart,
    http: {} as HttpStart,
    notifyAngular: jest.fn(),
    savePolicy: 'configAndData',
    showSaveModal: jest.fn(),
    setLiveResponseFields: jest.fn(),
    setUrlTemplates: jest.fn(),
    setWorkspaceInitialized: jest.fn(),
    ...mockedDepsOverwrites,
  };
  const sagaMiddleware = createSagaMiddleware();

  const rootReducer = createRootReducer(mockedDeps.basePath);
  const initializedRootReducer = (state: GraphState | undefined, action: AnyAction) =>
    rootReducer(state || (initialStateOverwrites as GraphState), action);

  const store = createStore(initializedRootReducer, applyMiddleware(sagaMiddleware));

  store.dispatch = jest.fn(store.dispatch);

  sagas.forEach(sagaCreator => {
    sagaMiddleware.run(sagaCreator(mockedDeps));
  });

  return { store, mockedDeps };
}
