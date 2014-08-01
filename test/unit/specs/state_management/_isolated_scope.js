define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var sinon = require('sinon/sinon');
  require('services/private');

  // Load kibana
  require('index');

  describe('State Management', function () {
    describe('IsolatedScope', function () {
      var $rootScope;
      var IsolatedScope;

      beforeEach(function () {
        module('kibana');

        inject(function (_$rootScope_, Private) {
          $rootScope = _$rootScope_;
          IsolatedScope = Private(require('components/state_management/_isolated_scope'));
        });
      });

      it('should handle $on events', function () {
        var scope = new IsolatedScope();
        var stub = sinon.stub();
        scope.$on('test', stub);
        scope.$emit('test', 'Hello World');
        sinon.assert.calledOnce(stub);
      });

      it('should handle $watch events', function () {
        var scope = new IsolatedScope();
        var stub = sinon.stub();
        scope.$watch('test', stub);
        scope.test = 'Hello World';
        $rootScope.$apply();
        sinon.assert.calledOnce(stub);
      });

      it('should work with inherited objects', function () {
        _.inherits(MyScope, IsolatedScope);
        function MyScope() {
          MyScope.Super.call(this);
        }
        var scope = new MyScope();
        var eventStub = sinon.stub();
        var watchStub = sinon.stub();
        scope.$on('test', eventStub);
        scope.$emit('test', 'Hello World');
        scope.$watch('test', watchStub);
        scope.test = 'Hello World';
        $rootScope.$apply();
        sinon.assert.calledOnce(eventStub);
        sinon.assert.calledOnce(watchStub);
      });

    });
  });

});
