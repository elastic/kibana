import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'auto-release-sinon';

describe('Promise service', function () {
  let Promise;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    Promise = $injector.get('Promise');
    $rootScope = $injector.get('$rootScope');
  }));

  describe('Constructor', function () {
    it('provides resolve and reject function', function () {
      new Promise(function (resolve, reject) {
        expect(resolve).to.be.a('function');
        expect(reject).to.be.a('function');
        expect(arguments).to.have.length(2);
      });
    });
  });

  it('Promise.resolve', function (done) {
    Promise.resolve(true).then(() => { done(); });
    // Ugly, but necessary for promises to resolve: https://github.com/angular/angular.js/issues/12555
    $rootScope.$apply();
  });

  describe('Promise.fromNode', function () {
    it('creates a callback that controls a promise', function () {
      let callback;
      Promise.fromNode(cb => (callback = cb)());
      $rootScope.$apply();
      expect(callback).to.be.a('function');
    });

    it('rejects if the callback receives an error', function () {
      let errback = sinon.stub();
      let err = new Error();
      Promise.fromNode(cb => cb(err)).catch(errback);
      $rootScope.$apply();

      expect(errback.callCount).to.be(1);
      expect(errback.getCall(0).args[0]).to.be(err);
    });

    it('resolves with the second argument', function () {
      let thenback = sinon.stub();
      let result = {};
      Promise.fromNode(cb => cb(null, result)).then(thenback);
      $rootScope.$apply();

      expect(thenback.callCount).to.be(1);
      expect(thenback.getCall(0).args[0]).to.be(result);
    });

    it('resolves with an array if multiple arguments are received', function () {
      let thenback = sinon.stub();
      let result1 = {};
      let result2 = {};
      Promise.fromNode(cb => cb(null, result1, result2)).then(thenback);
      $rootScope.$apply();

      expect(thenback.callCount).to.be(1);
      expect(thenback.getCall(0).args[0][0]).to.be(result1);
      expect(thenback.getCall(0).args[0][1]).to.be(result2);
    });

    it('resolves with an array if multiple undefined are received', function () {
      let thenback = sinon.stub();
      Promise.fromNode(cb => cb(null, undefined, undefined)).then(thenback);
      $rootScope.$apply();

      expect(thenback.callCount).to.be(1);
      expect(thenback.getCall(0).args[0][0]).to.be(undefined);
      expect(thenback.getCall(0).args[0][1]).to.be(undefined);
    });
  });
});
