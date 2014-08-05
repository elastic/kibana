define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var sinon = require('sinon/sinon');
  require('services/private');

  // Load kibana
  require('index');

  describe('State Management', function () {
    describe('Events', function () {
      var $rootScope;
      var Events;

      beforeEach(function () {
        module('kibana');

        inject(function (_$rootScope_, Private) {
          $rootScope = _$rootScope_;
          Events = Private(require('components/state_management/_events'));
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

    });
  });

});
