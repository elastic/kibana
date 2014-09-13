define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');
  require('services/private');

  describe('Events', function () {
    require('test_utils/no_digest_promises').activateForSuite();

    var $rootScope;
    var Events;
    var Notifier;
    var Promise;

    beforeEach(function () {
      module('kibana');

      inject(function ($injector, Private) {
        $rootScope = $injector.get('$rootScope');
        Notifier = $injector.get('Notifier');
        Promise = $injector.get('Promise');
        Events = Private(require('factories/events'));
      });
    });

    it('should handle on events', function (done) {
      var obj = new Events();
      obj.on('test', function (message) {
        expect(message).to.equal('Hello World');
        done();
      });
      obj.emit('test', 'Hello World');
    });

    it('should work with inherited objects', function (done) {
      _(MyEventedObject).inherits(Events);
      function MyEventedObject() {
        MyEventedObject.Super.call(this);
      }
      var obj = new MyEventedObject();
      obj.on('test', function (message) {
        expect(message).to.equal('Hello World');
        done();
      });
      obj.emit('test', 'Hello World');
    });

    it('should clear events when off is called', function () {
      var obj = new Events();
      obj.on('test', _.noop);
      expect(obj._listeners).to.have.property('test');
      expect(obj._listeners['test']).to.have.length(1);
      obj.off();
      expect(obj._listeners).to.not.have.property('test');
    });

    it('should clear a specific handler when off is called for an event', function (done) {
      var obj = new Events();
      var handler1 = sinon.stub();
      var handler2 = sinon.stub();
      obj.on('test', handler1);
      obj.on('test', handler2);
      expect(obj._listeners).to.have.property('test');
      obj.off('test', handler1);
      obj.emit('test', 'Hello World').then(function () {
        sinon.assert.calledOnce(handler2);
        sinon.assert.notCalled(handler1);
        done();
      });
    });

    it('should clear a all handlers when off is called for an event', function (done) {
      var obj = new Events();
      var handler1 = sinon.stub();
      obj.on('test', handler1);
      expect(obj._listeners).to.have.property('test');
      obj.off('test');
      expect(obj._listeners).to.not.have.property('test');
      obj.emit('test', 'Hello World').then(function () {
        sinon.assert.notCalled(handler1);
        done();
      });
    });

    it('should handle mulitple identical emits in the same tick', function (done) {
      var obj = new Events();
      var handler1 = sinon.stub();

      obj.on('test', handler1);
      var emits = [
        obj.emit('test', 'one'),
        obj.emit('test', 'two'),
        obj.emit('test', 'three')
      ];

      Promise.all(emits).then(function () {
        expect(handler1.callCount).to.be(emits.length);
        expect(handler1.getCall(0).calledWith('one')).to.be(true);
        expect(handler1.getCall(1).calledWith('two')).to.be(true);
        expect(handler1.getCall(2).calledWith('three')).to.be(true);
        done();
      });
    });

    it('should handle emits from the handler', function (done) {
      var obj = new Events();
      var secondEmit = Promise.defer();
      var handler1 = sinon.spy(function () {
        if (handler1.calledTwice) {
          return;
        }
        obj.emit('test').then(_.bindKey(secondEmit, 'resolve'));
      });

      obj.on('test', handler1);

      Promise.all([
        obj.emit('test'),
        secondEmit.promise
      ]).then(function () {
        expect(handler1.callCount).to.be(2);
        done();
      });
    });

    it('should only emit to handlers registered before emit is called', function (done) {
      var obj = new Events();
      var handler1 = sinon.stub();
      var handler2 = sinon.stub();

      obj.on('test', handler1);
      var emits = [
        obj.emit('test', 'one'),
        obj.emit('test', 'two'),
        obj.emit('test', 'three')
      ];


      Promise.all(emits).then(function () {
        expect(handler1.callCount).to.be(emits.length);

        obj.on('test', handler2);

        var emits2 = [
          obj.emit('test', 'four'),
          obj.emit('test', 'five'),
          obj.emit('test', 'six')
        ];

        Promise.all(emits2).then(function () {
          expect(handler1.callCount).to.be(emits.length + emits2.length);
          expect(handler2.callCount).to.be(emits2.length);
          done();
        });
      });
    });
  });
});
