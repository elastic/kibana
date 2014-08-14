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
  var getState = require('lib/ClusterState/getState');  
  var _ = require('lodash');

  describe('lib/ClusterState', function () {
    describe('#getState()', function () {

      var q, client, rootScope, testFn;
      var config = { elasticsearch: 'http://localhost:9200' };
      var succesFixture = {
        data: {
          hits: {
            total: 1,
            hits: [
              { _source: { hello: 'world' } }
            ]
          }
        }
      };
      var failFixture = { data: { hits: { total: 0 } } };

      beforeEach(inject(function ($q, $rootScope) {
        q = $q;
        rootScope = $rootScope;
        client = { post: sinon.stub()  };
        testFn = _.partial(getState, client, config);
      }));
      
      it('should throw an error if the indices are empty', function() {
        expect(function () { testFn([]); }).to.throw(Error); 
      });

      it('should call client.post once if the first request suceeds', function (done) {
        var deferred = q.defer(); 
        client.post.onFirstCall().returns(deferred.promise);
        testFn(['one']).then(function () {
          sinon.assert.calledOnce(client.post);
          done();
        });
        deferred.resolve(succesFixture);
        rootScope.$apply();
      });

      it('should return the source object on success', function (done) {
        var deferred = q.defer(); 
        client.post.onFirstCall().returns(deferred.promise);
        testFn(['one']).then(function (state) {
          expect(state.hello).to.equal('world');
          done();
        });
        deferred.resolve(succesFixture);
        rootScope.$apply();
      });

      it('should call client.post twice if the first fails to retrieve any files', function (done) {
        var first = q.defer(); 
        var second = q.defer(); 
        client.post.onFirstCall().returns(first.promise);
        client.post.onSecondCall().returns(second.promise);
        testFn(['one', 'two']).then(function () {
          sinon.assert.calledTwice(client.post);
          done();
        });
        first.resolve(failFixture);
        second.resolve(succesFixture);
        rootScope.$apply();
      });

      it('should call client.post twice if the first request fails', function (done) {
        var first = q.defer(); 
        var second = q.defer(); 
        client.post.onFirstCall().returns(first.promise);
        client.post.onSecondCall().returns(second.promise);
        testFn(['one', 'two']).then(function () {
          sinon.assert.calledTwice(client.post);
          done();
        });
        first.reject('Oops!');
        second.resolve(succesFixture);
        rootScope.$apply();
      });

    });
  });  
});
