/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import ngMock from 'ng_mock';

import { BehaviorSubject } from 'rxjs';

import { initializeAppState, subscribeAppStateToObservable } from '../app_state_utils';

describe('ML - initializeAppState', () => {
  let AppState;

  beforeEach(
    ngMock.module('kibana', stateManagementConfigProvider => {
      stateManagementConfigProvider.enable();
    })
  );

  beforeEach(
    ngMock.inject($injector => {
      AppState = $injector.get('AppState');
    })
  );

  it('Throws an error when called without arguments.', () => {
    expect(() => initializeAppState()).to.throwError();
  });

  it('Initializes an appstate, gets a test value.', () => {
    const appState = initializeAppState(AppState, 'mlTest', { value: 10 });
    expect(appState.mlTest.value).to.be(10);
  });
});

describe('ML - subscribeAppStateToObservable', () => {
  let AppState;
  let $rootScope;

  beforeEach(
    ngMock.module('kibana', stateManagementConfigProvider => {
      stateManagementConfigProvider.enable();
    })
  );

  beforeEach(
    ngMock.inject($injector => {
      AppState = $injector.get('AppState');
      $rootScope = $injector.get('$rootScope');
    })
  );

  it('Initializes a custom state store, sets and gets a test value using events.', done => {
    const o$ = new BehaviorSubject({ value: 10 });

    subscribeAppStateToObservable(AppState, 'mlTest', o$, () => $rootScope.$applyAsync());

    o$.subscribe(payload => {
      const appState = new AppState();
      appState.fetch();

      expect(payload.value).to.be(10);
      expect(appState.mlTest.value).to.be(10);

      done();
    });
  });
});
