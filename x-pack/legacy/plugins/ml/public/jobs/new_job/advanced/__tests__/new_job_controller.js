/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import ngMock from 'ng_mock';
import expect from '@kbn/expect';

describe('ML - Advanced Job Wizard - New Job Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize New Job Controller', (done) => {
    ngMock.inject(function ($rootScope, $controller, $route) {
      // Set up the $route current props required for the tests.
      $route.current = {
        locals: {
          indexPattern: {},
          savedSearch: {}
        }
      };

      const scope = $rootScope.$new();

      expect(() => {
        $controller('MlNewJob', { $scope: scope });
      }).to.not.throwError();

      // This is just about initializing the controller and making sure
      // all angularjs based dependencies get loaded without error.
      // This simple scope test is just a final sanity check.
      expect(scope.ui.pageTitle).to.be('Create a new job');
      done();
    });
  });
});
