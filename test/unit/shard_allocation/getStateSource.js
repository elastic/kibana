/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



define(function (require) {
  'use strict';
  var _ = require('lodash');
  var getStateSource = require('panels/marvel/shard_allocation/requests/getStateSource');
  describe('shard_allocation', function () {
    describe('requests/getStateSource.js', function () {

      var q, http, rootScope, firstPromise, testFn;

      var response = {
        data: {
          _source: { status: 'GREEN'}
        }
      };

      var config = { elasticsearch: 'http://localhost:9200' };


      var doc = {
        _id: 'test123',
        _index: 'index-1'
      };

      beforeEach(inject(function ($q, $rootScope) {
        rootScope = $rootScope;
        q = $q;
        firstPromise = q.defer();
        http = { get: sinon.stub() };
        http.get.onFirstCall().returns(firstPromise.promise);
        testFn = _.partial(getStateSource(http), config);
      }));

      it('should call get method with url', function (done) {
        testFn(doc).then(function () {
          var url = 'http://localhost:9200/index-1/cluster_state/test123';
          sinon.assert.calledWith(http.get, url);
          done();
        });
        firstPromise.resolve(response);
        rootScope.$apply();
      });

      it('should return the _source with _id set', function (done) {
        testFn(doc).then(function (data) {
          expect(data).to.have.property('status')
            .to.equal('GREEN');
          expect(data).to.have.property('_id')
            .to.equal('test123');
          done();
        });
        firstPromise.resolve(response);
        rootScope.$apply();
      });

      it('should return the falsey if the source cant be found', function (done) {
        testFn(doc).then(function (data) {
          expect(data).to.be.falsey;
          done();
        });
        firstPromise.resolve({ data: void 0 });
        rootScope.$apply();
      });

    }); 
  });
});
