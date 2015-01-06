define(function (require) {
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');
  var saveFilterState = require('components/filter_bar/lib/saveFilterState');
  var globalStateStub = require('fixtures/global_state');
  var $rootScope;

  describe('saveFilterState', function () {

    beforeEach(module('kibana'));

    beforeEach(function () {
      inject(function (_$rootScope_, _globalState_, Private) {
        $rootScope = _$rootScope_;
        $rootScope.state = {};
      });
    });

    describe('module', function () {
      it('should export a function', function () {
        expect(saveFilterState).to.be.a('function');
      });
    });

    describe('save state', function () {
      var saveState;
      var filters;

      beforeEach(function () {
        saveState = saveFilterState($rootScope.state, globalStateStub.resetStub());
        filters = [
          { meta: { index: 'logstash-*' }, query: { match: { '@tags': { query: 'foo' } } } },
          { meta: { index: 'logstash-*' }, query: { match: { '@tags': { query: 'bar' } } } },
        ];
      });

      it('should save filters to state', function () {
        saveState(filters);
        expect($rootScope.state.filters).to.eql(filters);
      });

      it('should save global filters', function () {
        expect(globalStateStub).not.to.have.property(filters);
        saveState(filters);
        expect(globalStateStub.filters).to.have.length(0);
        expect(globalStateStub.save.callCount).to.be(1);
      });
    });

    describe('save global state', function () {
      var saveState;

      beforeEach(function () {
        saveState = saveFilterState($rootScope.state, globalStateStub.resetStub());
      });

      it('should should save pinned filters to global state', function () {
        var filters = [
          { meta: { index: 'logstash-*' }, query: { match: { '@tags': { query: 'foo' } } } },
          { meta: { index: 'logstash-*' }, query: { match: { '@tags': { query: 'bar' } } } },
          { meta: { pinned: true, index: 'logstash-*' }, query: { match: { '@tags': { query: 'fizz' } } } },
          { meta: { pinned: true, index: 'logstash-*' }, query: { match: { '@tags': { query: 'buzz' } } } },
        ];

        saveState(filters);
        expect($rootScope.state.filters).to.have.length(filters.length);
        expect(globalStateStub.filters).to.eql([ filters[2], filters[3] ]);
      });
    });
  });
});
