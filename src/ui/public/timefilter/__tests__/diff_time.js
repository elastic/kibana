import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { TimefilterLibDiffTimeProvider } from 'ui/timefilter/lib/diff_time';

describe('Timefilter service', function () {
  describe('time diff watcher', function () {
    let fn;
    let update;
    let fetch;
    let timefilter;

    beforeEach(ngMock.module('kibana'));

    beforeEach(ngMock.inject(function (Private) {
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

      fn = Private(TimefilterLibDiffTimeProvider)(timefilter);
    }));

    it('not emit anything if the time has not changed', function () {
      timefilter.time = { from: 0, to: 1 };
      fn();
      expect(update.called).to.be(false);
      expect(fetch.called).to.be(false);
    });

    it('emit update and fetch if the time has changed', function () {
      timefilter.time = { from: 5, to: 10 };
      fn();
      expect(update.called).to.be(true);
      expect(fetch.called).to.be(true);
    });

  });
});
