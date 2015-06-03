define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
  describe('Timefilter service', function () {
    describe('time diff watcher', function () {

      var fn, update, fetch, timefilter;
      beforeEach(module('kibana'));

      beforeEach(inject(function (Private) {
        update = sinon.spy();
        fetch = sinon.spy();
        timefilter = {
          time: {
            from: 0,
            to: 1
          },
          emit: function (eventType) {
            if (eventType === 'update') update();
            if (eventType === 'fetch') fetch();
          }
        };

        fn = Private(require('components/timefilter/lib/diff_time'))(timefilter);
      }));

      it('not emit anything if the time has not changed', function () {
        timefilter.time = {from: 0, to: 1};
        fn();
        expect(update.called).to.be(false);
        expect(fetch.called).to.be(false);
      });

      it('emit update and fetch if the time has changed', function () {
        timefilter.time = {from: 5, to: 10};
        fn();
        expect(update.called).to.be(true);
        expect(fetch.called).to.be(true);
      });

    });
  });
});