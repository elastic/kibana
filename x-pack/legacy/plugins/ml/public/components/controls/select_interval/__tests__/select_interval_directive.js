/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import ngMock from 'ng_mock';

import { interval$ } from '../select_interval';

describe('ML - mlSelectIntervalService', () => {
  let appState;

  beforeEach(ngMock.module('kibana', (stateManagementConfigProvider) => {
    stateManagementConfigProvider.enable();
  }));
  beforeEach(ngMock.module(($provide) => {
    appState = {
      fetch: () => {},
      save: () => {}
    };

    $provide.factory('AppState', () => () => appState);
  }));

  it('initializes AppState with correct default value', (done) => {
    ngMock.inject(($injector) => {
      $injector.get('mlSelectIntervalService');
      const defaultValue = { display: 'Auto', val: 'auto' };

      expect(appState.mlSelectInterval).to.eql(defaultValue);
      expect(interval$.getValue()).to.eql(defaultValue);

      done();
    });
  });

  it('restores AppState to interval$ observable', (done) => {
    ngMock.inject(($injector) => {
      const restoreValue = { display: '1 day', val: 'day' };
      appState.mlSelectInterval = restoreValue;

      $injector.get('mlSelectIntervalService');

      expect(appState.mlSelectInterval).to.eql(restoreValue);
      expect(interval$.getValue()).to.eql(restoreValue);

      done();
    });
  });

});
