define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var sinon = require('sinon/sinon');
  require('services/private');

  // Load kibana
  require('index');

  describe.only('State Management', function () {
    describe('Events', function () {
      var $rootScope;
      var Events;

      beforeEach(function () {
        module('kibana');

        inject(function (_$rootScope_, Private) {
          $rootScope = _$rootScope_;
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
        $rootScope.$apply();
      });

      it('should work with inherited objects', function (done) {
        _.inherits(MyEventedObject, Events);
        function MyEventedObject() {
          MyEventedObject.Super.call(this);
        }
        var obj = new MyEventedObject();
        obj.on('test', function (message) {
          expect(message).to.equal('Hello World');
          done();
        });
        obj.emit('test', 'Hello World');
        $rootScope.$apply();
      });

      it('should clear events when off is called', function () {
        var obj = new Events();
        obj.on('test', _.noop);
        expect(obj._listeners).to.have.property('test');
        expect(obj._listeners['test']).to.have.length(1);
        obj.off();
        expect(obj._listeners).to.not.have.property('test');
      });

      it('should clear a specific handler when off is called for an event', function () {
        var obj = new Events();
        var handler1 = sinon.stub();
        var handler2 = sinon.stub();
        obj.on('test', handler1);
        obj.on('test', handler2);
        expect(obj._listeners).to.have.property('test');
        obj.off('test', handler1);
        obj.emit('test', 'Hello World');
        $rootScope.$apply();
        sinon.assert.calledOnce(handler2);
        sinon.assert.notCalled(handler1);
      });

      it('should clear a all handlers when off is called for an event', function () {
        var obj = new Events();
        var handler1 = sinon.stub();
        obj.on('test', handler1);
        expect(obj._listeners).to.have.property('test');
        obj.off('test');
        expect(obj._listeners).to.not.have.property('test');
        obj.emit('test', 'Hello World');
        $rootScope.$apply();
        sinon.assert.notCalled(handler1);
      });

      it('should handle mulitple identical emits in the same tick', function () {
        var obj = new Events();
        var handler1 = sinon.stub();

        obj.on('test', handler1);
        obj.emit('test', 'one');
        obj.emit('test', 'two');
        obj.emit('test', 'three');

        $rootScope.$apply();

        expect(handler1.callCount).to.be(3);
        expect(handler1.getCall(0).calledWith('one')).to.be(true);
        expect(handler1.getCall(1).calledWith('two')).to.be(true);
        expect(handler1.getCall(2).calledWith('three')).to.be(true);
      });
    });
  });

});
