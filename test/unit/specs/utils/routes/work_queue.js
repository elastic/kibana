define(function (require) {
  return function () {
    describe('work queue', function () {
      describe('#push', function () {
        it('adds to the interval queue');
      });

      describe('#resolveWhenFull', function () {
        it('resolves requests waiting for the queue to fill when appropriate');
      });

      describe('#doWork', function () {
        it('flushes the queue and resolves all promises');
      });

      describe('#empty()', function () {
        it('empties the internal queue');
      });
    });
  };
});