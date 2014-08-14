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



/* jshint */
define(function (require) {
  'use strict';
  var refreshState = require('lib/ClusterState/refreshState');  
  var _ = require('lodash');

  describe('lib/ClusterState', function () {
    describe('#refreshState()', function () {
      var q, rootScope, testFn, client, service, getIndices;
      var dashboard = { indices: ['one', 'two', 'three'] };
      var stateFixture = {
        version: 1,
        '@timestamp': new Date(),
        state: { version: 1, indices: [] } 
      };

      beforeEach(inject(function ($q, $rootScope) {
        rootScope = $rootScope;
        service = $rootScope.$new(true);
        service.version = 0;
        service.state = false;
        q = $q;
        client = sinon.stub();
        getIndices = sinon.stub();
        testFn = _.partial(refreshState, service, client, getIndices);
      })); 

      it('should call client once', function (done) {
        var clientDeferred= q.defer();
        var indicesDeferred = q.defer();
        client.onFirstCall().returns(clientDeferred.promise);
        getIndices.onFirstCall().returns(indicesDeferred.promise);
        testFn().then(function () {
          sinon.assert.calledOnce(client);
          done();
        });
        clientDeferred.resolve(stateFixture);
        indicesDeferred.resolve(dashboard.indices);
        rootScope.$apply();
      });

      it('should emit an update when the version changes', function (done) {
        var clientDeferred= q.defer();
        var indicesDeferred = q.defer();
        client.onFirstCall().returns(clientDeferred.promise);
        getIndices.onFirstCall().returns(indicesDeferred.promise);
        service.$on('update', function (state) {
          expect(service.version).to.equal(stateFixture['@timestamp']);
          done();
        });
        testFn();
        clientDeferred.resolve(stateFixture);
        indicesDeferred.resolve(dashboard.indices);
        rootScope.$apply();
      });

      it('should emit an error when the client fails', function (done) {
        var clientDeferred= q.defer();
        var indicesDeferred = q.defer();
        client.onFirstCall().returns(clientDeferred.promise);
        getIndices.onFirstCall().returns(indicesDeferred.promise);
        service.$on('error', function ($event, err) {
          expect(err).to.equal('oops');
          done();
        });
        testFn();
        clientDeferred.reject('oops');
        indicesDeferred.resolve(dashboard.indices);
        rootScope.$apply();
      });

      it('should set the state when it updates', function (done) {
        var indicesDeferred = q.defer();
        var clientDeferred = q.defer();
        client.onFirstCall().returns(clientDeferred.promise);
        getIndices.onFirstCall().returns(indicesDeferred.promise);
        service.$on('update', function (state) {
          expect(service.state.version).to.equal(stateFixture.version);
          expect(service.state.indices).to.deep.equal(stateFixture.indices);
          done();
        });
        testFn();
        clientDeferred.resolve(stateFixture);
        indicesDeferred.resolve(dashboard.indices);
        rootScope.$apply();

      });
    });
  });  
});
