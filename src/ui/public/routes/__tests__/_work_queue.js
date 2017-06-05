import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { WorkQueue } from 'ui/routes/work_queue';
import sinon from 'sinon';
import 'ui/promises';

describe('work queue', function () {
  let queue;
  let Promise;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_Promise_) {
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
      const size = _.random(5, 50);
      queue.limit = size;

      const whenFull = Promise.defer();
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
    const size = _.random(5, 50);
    const stub = sinon.stub();

    _.times(size, function () {
      const d = Promise.defer();
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
