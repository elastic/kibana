import 'angular';
import $ from 'jquery';
import _ from 'lodash';
import expect from 'expect.js';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import { EventsProvider } from 'ui/events';
import { ReflowWatcherProvider } from 'ui/reflow_watcher';
describe('Reflow watcher', function () {
  const sandbox = sinon.sandbox.create();

  const $body = $(document.body);
  const $window = $(window);
  const expectStubbedEventAndEl = function (stub, event, $el) {
    expect(stub.getCalls().some(function (call) {
      const events = call.args[0].split(' ');
      return _.contains(events, event) && $el.is(call.thisValue);
    })).to.be(true);
  };

  let EventEmitter;
  let reflowWatcher;
  let $rootScope;

  beforeEach(ngMock.module('kibana', function () {
    // Stub jQuery's $.on and $.off methods while creating the reflowWatcher.
    sandbox.stub($.fn, 'on');
    sandbox.stub($.fn, 'off');
  }));
  beforeEach(ngMock.inject(function (Private, $injector) {
    $rootScope = $injector.get('$rootScope');
    EventEmitter = Private(EventsProvider);
    reflowWatcher = Private(ReflowWatcherProvider);
    // setup the reflowWatchers $http watcher
    $rootScope.$apply();
  }));
  afterEach(function () {
    sandbox.restore();
  });

  it('is an event emitter', function () {
    expect(reflowWatcher).to.be.an(EventEmitter);
  });

  describe('listens', function () {
    it('to "mouseup" on the body', function () {
      expectStubbedEventAndEl($.fn.on, 'mouseup', $body);
    });

    it('to "resize" on the window', function () {
      expectStubbedEventAndEl($.fn.on, 'resize', $window);
    });
  });

  describe('un-listens in #destroy()', function () {
    beforeEach(function () {
      reflowWatcher.destroy();
    });

    it('to "mouseup" on the body', function () {
      expectStubbedEventAndEl($.fn.off, 'mouseup', $body);
    });

    it('to "resize" on the window', function () {
      expectStubbedEventAndEl($.fn.off, 'resize', $window);
    });
  });

  it('triggers the "reflow" event within a new angular tick', function () {
    const stub = sinon.stub();
    reflowWatcher.on('reflow', stub);
    reflowWatcher.trigger();

    sinon.assert.notCalled(stub);
    $rootScope.$apply();
    sinon.assert.calledOnce(stub);
  });
});
