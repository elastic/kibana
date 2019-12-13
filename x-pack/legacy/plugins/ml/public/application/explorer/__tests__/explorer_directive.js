/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ngMock from 'ng_mock';
import sinon from 'sinon';
import expect from '@kbn/expect';

import { uiChromeMock, uiTimefilterMock, uiTimeHistoryMock } from '../../contexts/ui/__mocks__/mocks_mocha';
import * as useUiContextModule from '../../contexts/ui/use_ui_context';
import * as UiTimefilterModule from 'ui/timefilter';

describe('ML - Anomaly Explorer Directive', () => {
  let $scope;
  let $compile;
  let $element;
  let stubContext;
  let stubTimefilterFetch;

  beforeEach(ngMock.module('kibana'));
  beforeEach(() => {
    ngMock.inject(function ($injector) {
      stubContext = sinon.stub(useUiContextModule, 'useUiContext').callsFake(function fakeFn() {
        return {
          chrome: uiChromeMock,
          timefilter: uiTimefilterMock,
          timeHistory: uiTimeHistoryMock,
        };
      });
      stubTimefilterFetch = sinon.stub(UiTimefilterModule.timefilter, 'getFetch$').callsFake(uiTimefilterMock.getFetch$);

      $compile = $injector.get('$compile');
      const $rootScope = $injector.get('$rootScope');
      $scope = $rootScope.$new();
    });
  });

  afterEach(() => {
    stubContext.restore();
    stubTimefilterFetch.restore();
    $scope.$destroy();
  });

  it('Initialize Anomaly Explorer Directive', (done) => {
    ngMock.inject(function () {
      expect(() => {
        $element = $compile('<ml-anomaly-explorer />')($scope);
      }).to.not.throwError();

      // directive has scope: false
      const scope = $element.isolateScope();
      expect(scope).to.eql(undefined);
      done();
    });
  });
});
