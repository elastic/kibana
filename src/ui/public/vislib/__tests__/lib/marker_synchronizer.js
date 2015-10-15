describe('Vislib Marker Synchronizer', function () {
  var _ = require('lodash');
  var ngMock = require('ngMock');
  var expect = require('expect.js');

  var SimpleEmitter = require('ui/utils/SimpleEmitter');
  var sync;

  var EVENT_TIME_BASED = { data: { ordered: { date: true } } };
  var EVENT_NON_TIME_BASED = { data: { ordered: { date: false } } };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (markerSync) {
    sync = markerSync;
  }));

  describe('basic functionality', function () {
    it('is a simple emitter', function () {
      expect(sync).to.be.a(SimpleEmitter);
    });

    it('emits a "sync" event when the hover handler is called', function (done) {
      sync.on('sync', function () {
        done();
      });

      sync.hoverHandler()(EVENT_TIME_BASED);
    });

    it('ignores a call of the hover handler from a non time-based chart', function () {
      sync.on('sync', function () {
        expect().fail('"sync" event should not be emitted');
      });

      sync.hoverHandler()(EVENT_NON_TIME_BASED);
    });
  });
});
