/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import sinon from 'sinon';

// Import this way to be able to stub/mock functions later on in the tests using sinon.
import * as indexUtils from 'plugins/ml/util/index_utils';

describe('ML - Job Type Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Job Type Controller', (done) => {
    const stub = sinon.stub(indexUtils, 'timeBasedIndexCheck').callsFake(() => false);
    ngMock.inject(function ($rootScope, $controller, $route) {
      // Set up the $route current props required for the tests.
      $route.current = {
        locals: {
          indexPattern: {
            id: 'test_id',
            title: 'test_pattern'
          },
          savedSearch: {}
        }
      };

      const scope = $rootScope.$new();

      expect(() => {
        $controller('MlNewJobStepJobType', { $scope: scope });
      }).to.not.throwError();

      expect(scope.indexWarningTitle).to.eql('Index pattern test_pattern is not time based');
      stub.restore();
      done();
    });
  });
});
