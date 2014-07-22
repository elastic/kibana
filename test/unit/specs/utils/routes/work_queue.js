define(function (require) {

  var _ = require('lodash');
  var WorkQueue = require('utils/routes/_work_queue');
  var sinon = require('test_utils/auto_release_sinon');
  require('services/promises');
  require('angular').module('UtilsRouteWorkQueueTests', ['kibana']);

  return function () {
    describe('work queue', function () {
      var queue;
      var Promise;

      beforeEach(module('UtilsRouteWorkQueueTests'));
      beforeEach(inject(function (_Promise_) {
        Promise = _Promise_;
      }));
      beforeEach(function () { queue = new WorkQueue(); });
      afterEach(function () { queue.empty(); });

      describe('#push', function () {
        it('adds to the interval queue', function () {
          queue.push(Promise.defer());
          expect(queue).to.have.length(1);
        });
      });

      describe('#resolveWhenFull', function () {
        it('resolves requests waiting for the queue to fill when appropriate', function () {
          var size = _.random(5, 50);
          queue.limit = size;

          var whenFull = Promise.defer();
          sinon.stub(whenFull, 'resolve');
          queue.resolveWhenFull(whenFull);

          // push all but one into the queue
          _.times(size - 1, function () {
            queue.push(Promise.defer());
          });

          expect(whenFull.resolve.callCount).to.be(0);
          queue.push(Promise.defer());
          expect(whenFull.resolve.callCount).to.be(1);

          queue.empty();
        });
      });

      /**
       * Fills the queue with a random number of work defers, but stubs all defer methods
       * with the same stub and passed it back.
       *
       * @param  {function} then - called with then(size, stub) so that the test
       *                         can manipulate the filled queue
       */
      function fillWithStubs(then) {
        var size = _.random(5, 50);
        var stub = sinon.stub();

        _.times(size, function () {
          var d = Promise.defer();
          // overwrite the defer methods with the stub
          d.resolve = stub;
          d.reject = stub;
          queue.push(d);
        });

        then(size, stub);
      }

      describe('#doWork', function () {
        it('flushes the queue and resolves all promises', function () {
          fillWithStubs(function (size, stub) {
            expect(queue).to.have.length(size);
            queue.doWork();
            expect(queue).to.have.length(0);
            expect(stub.callCount).to.be(size);
          });
        });
      });

      describe('#empty()', function () {
        it('empties the internal queue WITHOUT resolving any promises', function () {
          fillWithStubs(function (size, stub) {
            expect(queue).to.have.length(size);
            queue.empty();
            expect(queue).to.have.length(0);
            expect(stub.callCount).to.be(0);
          });
        });
      });
    });
  };
});