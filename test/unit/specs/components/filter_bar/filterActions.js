define(function (require) {
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');
  var filterActions;
  var $rootScope, globalStateStub;

  describe('Filter Bar Actions', function () {

    beforeEach(function () {
      module('kibana', function ($provide) {
        $provide.service('globalState', function () {
          globalStateStub = {};
          globalStateStub.on = globalStateStub.off = _.noop;
          globalStateStub.save = sinon.stub();

          return globalStateStub;
        });
      });

      inject(function (_$rootScope_, Private) {
        $rootScope = _$rootScope_;
        filterActions = Private(require('components/filter_bar/lib/filterActions'));
      });
    });


    describe('initialize', function () {
      it('should call save on global state', function () {
        var actions = filterActions($rootScope);
        expect(globalStateStub.save.callCount).to.be(1);
      });
    });

    describe('apply', function () {
      it('should apply methods to scope', function () {
        var actions = filterActions($rootScope);

        var methods = _.filter(_.keys(actions), function (method) {
          return method !== 'apply';
        });

        filterActions($rootScope).apply();

        _.each(methods, function (method) {
          expect($rootScope).to.have.property(method);
        });
      });
    });
  });

  describe('Filter Bar Actions', function () {
    var childSuites = [
      require('specs/components/filter_bar/_filterToggle'),
      require('specs/components/filter_bar/_filterInvert'),
      require('specs/components/filter_bar/_filterPin'),
      require('specs/components/filter_bar/_filterAdd'),
      require('specs/components/filter_bar/_filterRemove'),
    ].forEach(function (s) {
      describe(s[0], s[1]);
    });
  });
});
