
var sinon = require('auto-release-sinon');
var expect = require('expect.js');
var ngMock = require('ngMock');

describe('Timefilter service', function () {
  describe('Refresh interval diff watcher', function () {

    var fn, update, fetch, timefilter;
    beforeEach(ngMock.module('kibana'));

    beforeEach(ngMock.inject(function (Private) {
      update = sinon.spy();
      fetch = sinon.spy();
      timefilter = {
        refreshInterval: {
          pause: false,
          value: 0
        },
        emit: function (eventType) {
          if (eventType === 'update') update();
          if (eventType === 'fetch') fetch();
        }
      };

      fn = Private(require('ui/timefilter/lib/diff_interval'))(timefilter);
    }));

    it('not emit anything if nothing has changed', function () {
      timefilter.refreshInterval = {pause: false, value: 0};
      fn();
      expect(update.called).to.be(false);
      expect(fetch.called).to.be(false);
    });

    it('emit only an update when paused', function () {
      timefilter.refreshInterval = {pause: true, value: 5000};
      fn();
      expect(update.called).to.be(true);
      expect(fetch.called).to.be(false);
    });

    it('emit update, not fetch, when switching to value: 0', function () {
      timefilter.refreshInterval = {pause: false, value: 5000};
      fn();
      expect(update.calledOnce).to.be(true);
      expect(fetch.calledOnce).to.be(true);
      timefilter.refreshInterval = {pause: false, value: 0};
      fn();
      expect(update.calledTwice).to.be(true);
      expect(fetch.calledTwice).to.be(false);
    });

    it('should emit update, not fetch, when moving from unpaused to paused', function () {
      timefilter.refreshInterval = {pause: false, value: 5000};
      fn();
      expect(update.calledOnce).to.be(true);
      expect(fetch.calledOnce).to.be(true);
      timefilter.refreshInterval = {pause: true, value: 5000};
      fn();
      expect(update.calledTwice).to.be(true);
      expect(fetch.calledTwice).to.be(false);
    });

    it('should emit update and fetch when unpaused', function () {
      timefilter.refreshInterval = {pause: true, value: 5000};
      fn();
      expect(update.calledOnce).to.be(true);
      expect(fetch.calledOnce).to.be(false);
      timefilter.refreshInterval = {pause: false, value: 5000};
      fn();
      expect(update.calledTwice).to.be(true);
      expect(fetch.calledOnce).to.be(true);
    });

  });
});