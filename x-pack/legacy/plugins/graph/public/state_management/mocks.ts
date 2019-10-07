/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Chrome } from 'ui/chrome';
import { IndexPattern } from 'src/legacy/core_plugins/data/public';
import { NotificationsStart } from 'kibana/public';
import createSagaMiddleware from 'redux-saga';
import { createStore, applyMiddleware } from 'redux';
import { GraphStoreDependencies, createRootReducer, registerSagas } from './store';
import { Workspace, GraphWorkspaceSavedObject, IndexPatternSavedObject } from '../types';

jest.mock('ui/new_platform');

export function createMockGraphStore({ includeSagas }: { includeSagas: boolean }) {
  const mockedDeps: jest.Mocked<GraphStoreDependencies> = {
    basePath: '',
    changeUrl: jest.fn(),
    chrome: ({
      breadcrumbs: {
        set: jest.fn(),
      },
    } as unknown) as Chrome,
    createWorkspace: jest.fn(),
    getWorkspace: jest.fn(() => (({} as unknown) as Workspace)),
    getSavedWorkspace: jest.fn(() => (({} as unknown) as GraphWorkspaceSavedObject)),
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
    notifyAngular: jest.fn(),
    savePolicy: 'configAndDataWithConsent',
    showSaveModal: jest.fn(),
    setLiveResponseFields: jest.fn(),
  };
  const sagaMiddleware = createSagaMiddleware();

  const rootReducer = createRootReducer('');

  const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));

  if (includeSagas) {
    registerSagas(sagaMiddleware, mockedDeps);
  }

  return { store, mockedDeps };
}
