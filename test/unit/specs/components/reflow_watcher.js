define(function (require) {
  describe('Reflow watcher', function () {
    require('angular');
    var $ = require('jquery');
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');

    var $body = $(document.body);
    var $window = $(window);
    var expectStubbedEventAndEl = function (stub, event, $el) {
      expect(stub.getCalls().some(function (call) {
        var events = call.args[0].split(' ');
        return _.contains(events, event) && $el.is(call.thisValue);
      })).to.be(true);
    };

    var EventEmitter;
    var reflowWatcher;
    var $rootScope;
    var $onStub;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector) {
      $rootScope = $injector.get('$rootScope');
      EventEmitter = Private(require('factories/events'));

      // stub jQuery's $.on method while creating the reflowWatcher
      $onStub = sinon.stub($.fn, 'on');
      reflowWatcher = Private(require('components/reflow_watcher'));
      $onStub.restore();

      // setup the reflowWatchers $http watcher
      $rootScope.$apply();
    }));

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
      var $offStub;

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
      var stub = sinon.stub();
      reflowWatcher.on('reflow', stub);
      reflowWatcher.trigger();

      expect(stub).to.have.property('callCount', 0);
      $rootScope.$apply();
      expect(stub).to.have.property('callCount', 1);
    });
  });
});