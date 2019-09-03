/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from '@kbn/expect';

describe('ML - Explorer Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Explorer Controller', () => {
    ngMock.inject(function ($rootScope, $controller) {
      const scope = $rootScope.$new();
      $controller('MlExplorerController', { $scope: scope });

      expect(Array.isArray(scope.jobs)).to.be(true);
    });
  });
});
