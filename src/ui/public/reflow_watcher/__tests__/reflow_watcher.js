import 'angular';
import $ from 'jquery';
import _ from 'lodash';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';
import ngMock from 'ng_mock';
import EventsProvider from 'ui/events';
import ReflowWatcherProvider from 'ui/reflow_watcher';
describe('Reflow watcher', function () {

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
  let $onStub;

  beforeEach(ngMock.module('kibana', function () {
    // stub jQuery's $.on method while creating the reflowWatcher
    $onStub = sinon.stub($.fn, 'on');
  }));
  beforeEach(ngMock.inject(function (Private, $injector) {
    $rootScope = $injector.get('$rootScope');
    EventEmitter = Private(EventsProvider);
    reflowWatcher = Private(ReflowWatcherProvider);
    // setup the reflowWatchers $http watcher
    $rootScope.$apply();
  }));
  afterEach(function () {
    $onStub.restore();
  });

  it('is an event emitter', function () {
    expect(reflowWatcher).to.be.an(EventEmitter);
  });

  describe('listens', function () {
    it('to "mouseup" on the body', function () {
      expectStubbedEventAndEl($onStub, 'mouseup', $body);
    });

    it('to "resize" on the window', function () {
      expectStubbedEventAndEl($onStub, 'resize', $window);
    });
  });

  describe('un-listens in #destroy()', function () {
    let $offStub;

    beforeEach(function () {
      $offStub = sinon.stub($.fn, 'off');
      reflowWatcher.destroy();
      $offStub.restore();
    });

    it('to "mouseup" on the body', function () {
      expectStubbedEventAndEl($offStub, 'mouseup', $body);
    });

    it('to "resize" on the window', function () {
      expectStubbedEventAndEl($offStub, 'resize', $window);
    });
  });

  it('triggers the "reflow" event within a new angular tick', function () {
    const stub = sinon.stub();
    reflowWatcher.on('reflow', stub);
    reflowWatcher.trigger();

    expect(stub).to.have.property('callCount', 0);
    $rootScope.$apply();
    expect(stub).to.have.property('callCount', 1);
  });
});
