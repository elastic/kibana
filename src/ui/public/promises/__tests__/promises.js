import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

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
      const errback = sinon.stub();
      const err = new Error();
      Promise.fromNode(cb => cb(err)).catch(errback);
      $rootScope.$apply();

      expect(errback.callCount).to.be(1);
      expect(errback.getCall(0).args[0]).to.be(err);
    });

    it('resolves with the second argument', function () {
      const thenback = sinon.stub();
      const result = {};
      Promise.fromNode(cb => cb(null, result)).then(thenback);
      $rootScope.$apply();

      expect(thenback.callCount).to.be(1);
      expect(thenback.getCall(0).args[0]).to.be(result);
    });

    it('resolves with an array if multiple arguments are received', function () {
      const thenback = sinon.stub();
      const result1 = {};
      const result2 = {};
      Promise.fromNode(cb => cb(null, result1, result2)).then(thenback);
      $rootScope.$apply();

      expect(thenback.callCount).to.be(1);
      expect(thenback.getCall(0).args[0][0]).to.be(result1);
      expect(thenback.getCall(0).args[0][1]).to.be(result2);
    });

    it('resolves with an array if multiple undefined are received', function () {
      const thenback = sinon.stub();
      Promise.fromNode(cb => cb(null, undefined, undefined)).then(thenback);
      $rootScope.$apply();

      expect(thenback.callCount).to.be(1);
      expect(thenback.getCall(0).args[0][0]).to.be(undefined);
      expect(thenback.getCall(0).args[0][1]).to.be(undefined);
    });
  });

  describe('Promise.race()', () => {
    let crankTimeout;
    beforeEach(() => {
      // constantly call $rootScope.$apply() in a loop so we can
      // pretend that these are real promises
      (function crank$apply() {
        $rootScope.$apply();
        crankTimeout = setTimeout(crank$apply, 1);
      }());
    });

    afterEach(() => {
      clearTimeout(crankTimeout);
    });

    it(`resolves with the first resolved promise's value`, async () => {
      const p1 = new Promise(resolve => setTimeout(resolve, 100, 1));
      const p2 = new Promise(resolve => setTimeout(resolve, 200, 2));
      expect(await Promise.race([p1, p2])).to.be(1);
    });
    it(`rejects with the first rejected promise's rejection reason`, async () => {
      const p1 = new Promise((r, reject) => setTimeout(reject, 200, new Error(1)));
      const p2 = new Promise((r, reject) => setTimeout(reject, 100, new Error(2)));
      expect(await Promise.race([p1, p2]).catch(e => e.message)).to.be('2');
    });
    it('does not wait for subsequent promises to resolve/reject', async () => {
      const start = Date.now();
      const p1 = new Promise(resolve => setTimeout(resolve, 100));
      const p2 = new Promise(resolve => setTimeout(resolve, 5000));
      await Promise.race([p1, p2]);
      const time = Date.now() - start;
      expect(time).to.not.be.lessThan(100);
      expect(time).to.not.be.greaterThan(2000);
    });
    it('allows non-promises in the array', async () => {
      expect(await Promise.race([1,2,3])).to.be(1);
    });
    describe('argument is undefined', () => {
      it('rejects the promise', async () => {
        const football = {};
        expect(await Promise.race().catch(() => football)).to.be(football);
      });
    });
    describe('argument is a string', () => {
      it(`resolves with the first character`, async () => {
        expect(await Promise.race('abc')).to.be('a');
      });
    });
    describe('argument is a non-iterable object', () => {
      it('reject the promise', async () => {
        const football = {};
        expect(await Promise.race({}).catch(() => football)).to.be(football);
      });
    });
    describe('argument is a generator', () => {
      it('resolves with the first resolved value', async () => {
        function *gen() {
          yield new Promise(resolve => setTimeout(resolve, 100, 1));
          yield new Promise(resolve => setTimeout(resolve, 200, 2));
        }

        expect(await Promise.race(gen())).to.be(1);
      });
      it('resolves with the first non-promise value', async () => {
        function *gen() {
          yield 1;
          yield new Promise(resolve => setTimeout(resolve, 200, 2));
        }

        expect(await Promise.race(gen())).to.be(1);
      });
      it('iterates all values from the generator, even if one is already "resolved"', async () => {
        let yieldCount = 0;
        function *gen() {
          yieldCount += 1;
          yield 1;
          yieldCount += 1;
          yield new Promise(resolve => setTimeout(resolve, 200, 2));
        }

        expect(await Promise.race(gen())).to.be(1);
        expect(yieldCount).to.be(2);
      });
    });
  });
});
