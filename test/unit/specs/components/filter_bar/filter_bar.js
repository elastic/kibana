define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var sinon = require('sinon/sinon');
  var $ = require('jquery');

  require('components/filter_bar/filter_bar');

  describe('Filter Bar Directivez', function () {

    var $rootScope, $compile, $timeout, Promise, mapFilter, getIndexPatternStub, indexPattern, $el;

    beforeEach(function () {
      // load the application
      module('kibana');

      getIndexPatternStub = sinon.stub();
      module('kibana/courier', function ($provide) {
        $provide.service('courier', function () {
          var courier = { indexPatterns: { get: getIndexPatternStub } };
          return courier;
        });
      });

      inject(function (_$rootScope_, _$compile_, _$timeout_, _Promise_, Private) {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
        $timeout = _$timeout_;
        Promise = _Promise_;
        mapFilter = Private(require('components/filter_bar/lib/mapFilter'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        getIndexPatternStub.returns(Promise.resolve(indexPattern));
      });

    });

    beforeEach(function () {
      var filters = [
        { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'apache' } } } },
        { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'nginx' } } } },
        { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
        { meta: { index: 'logstash-*' }, missing: { field: 'host' }, disabled: true },
      ];

      Promise.map(filters, mapFilter).then(function (filters) {
        $rootScope.state = { filters: filters };
      });
      $rootScope.$digest();

      $el = $compile('<filter-bar state=state></filter-bar>')($rootScope);
      $rootScope.$digest();
    });

    it('should render all the filters in state', function () {
      var filters = $el.find('.filter');
      expect(filters).to.have.length(4);
      expect($(filters[0]).find('span')[0].innerHTML).to.equal('_type:');
      expect($(filters[0]).find('span')[1].innerHTML).to.equal('"apache"');
      expect($(filters[1]).find('span')[0].innerHTML).to.equal('_type:');
      expect($(filters[1]).find('span')[1].innerHTML).to.equal('"nginx"');
      expect($(filters[2]).find('span')[0].innerHTML).to.equal('exists:');
      expect($(filters[2]).find('span')[1].innerHTML).to.equal('"@timestamp"');
      expect($(filters[3]).find('span')[0].innerHTML).to.equal('missing:');
      expect($(filters[3]).find('span')[1].innerHTML).to.equal('"host"');
    });

  });
});
