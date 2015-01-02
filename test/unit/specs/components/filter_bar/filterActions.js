define(function (require) {
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');
  var filterActions;
  var $rootScope, globalStateMock;

  describe('Filter Bar Actions', function () {

    beforeEach(function () {
      module('kibana', function ($provide) {
        $provide.service('globalState', function () {
          globalStateMock = {};
          globalStateMock.on = globalStateMock.off = _.noop;
          globalStateMock.save = sinon.stub();

          return globalStateMock;
        });
      });

      inject(function (_$rootScope_, Private) {
        $rootScope = _$rootScope_;
        filterActions = Private(require('components/filter_bar/lib/filterActions'));
      });
    });


    describe('global state', function () {
      beforeEach(function () {
        globalStateMock.filters = [
          { meta: { pinned: true }, query: { match: { '@tags': { query: 'test1' } } } },
          { meta: { pinned: false }, query: { match: { '@tags': { query: 'test2' } } } }
        ];
      });

      it('should call save on global state', function () {
        var actions = filterActions($rootScope);
        expect(globalStateMock.save.callCount).to.be(1);
      });

      it('should load filters from global state', function () {
        expect($rootScope.filters).to.be(undefined);
        var actions = filterActions($rootScope);
        expect($rootScope.filters.length).to.be(2);
      });

      it('should only persist pinned filters in global state', function () {
        expect(globalStateMock.filters.length).to.be(2);
        var actions = filterActions($rootScope);
        expect(globalStateMock.filters.length).to.be(1);
      });

      it('should merge scope state and global state', function () {
        $rootScope.state = {
          filters: [
            { meta: { negate: true }, query: { match: { '@tags': { query: 'test4' } } } }
          ]
        };

        var actions = filterActions($rootScope);
        expect($rootScope.filters.length).to.eql(3);
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
      require('specs/components/filter_bar/_filterAdd'),
      require('specs/components/filter_bar/_filterRemove'),
    ].forEach(function (s) {
      describe(s[0], s[1]);
    });
  });
});
