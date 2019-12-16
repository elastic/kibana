/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ngMock from 'ng_mock';
import expect from '@kbn/expect';

describe('ML - Time Series Explorer Directive', () => {
  let $scope;
  let $compile;
  let $element;

  beforeEach(ngMock.module('kibana'));
  beforeEach(() => {
    ngMock.inject(function($injector) {
      $compile = $injector.get('$compile');
      const $rootScope = $injector.get('$rootScope');
      $scope = $rootScope.$new();
    });
  });

  afterEach(() => {
    $scope.$destroy();
  });

  it('Initialize Time Series Explorer Directive', done => {
    ngMock.inject(function() {
      expect(() => {
        $element = $compile('<ml-timeseries-explorer />')($scope);
      }).to.not.throwError();

      // directive has scope: false
      const scope = $element.isolateScope();
      expect(scope).to.eql(undefined);
      done();
    });
  });
});
