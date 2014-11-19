define(function (require) {
  return ['Integration', function () {
    var $ = require('jquery');
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');

    var $rootScope;
    var TableGroup;
    var $compile;
    var $scope;
    var $el;
    var Vis;
    var indexPattern;
    var fixtures;

    beforeEach(module('kibana', 'kibana/table_vis'));
    beforeEach(inject(function (Private, $injector) {
      $rootScope = $injector.get('$rootScope');
      $compile = $injector.get('$compile');
      fixtures = require('fixtures/fake_hierarchical_data');
      TableGroup = Private(require('components/agg_response/tabify/_table_group'));
      Vis = Private(require('components/vis/vis'));
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
    }));

    // basically a parameterized beforeEach
    function init(vis, esResponse) {
      vis.aggs.forEach(function (agg, i) { agg.id = 'agg_' + (i + 1); });

      $rootScope.vis = vis;
      $rootScope.esResponse = esResponse;
      $el = $('<visualize vis="vis" es-resp="esResponse">');
      $compile($el)($rootScope);
      $rootScope.$apply();

      $scope = $el.isolateScope();
    }

    function OneRangeVis(params) {
      return new Vis(indexPattern, {
        type: 'table',
        params: params || {},
        aggs: [
          { type: 'count', schema: 'metric' },
          {
            type: 'range',
            schema: 'bucket',
            params: {
              field: 'bytes',
              ranges: [
                { from: 0, to: 1000 },
                { from: 1000, to: 2000 }
              ]
            }
          }
        ]
      });
    }

    function ThreeTermVis(params) {
      return new Vis(indexPattern, {
        type: 'table',
        params: params,
        aggs: [
          { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
          {
            type: 'terms',
            schema: 'split',
            params: {
              field: 'extension'
            }
          },
          {
            type: 'terms',
            schema: 'bucket',
            params: {
              field: 'geo.src'
            }
          },
          {
            type: 'terms',
            schema: 'bucket',
            params: {
              field: 'machine.os'
            }
          }
        ]
      });
    }

    it('passes the table groups to the kbnAggTableGroup directive', function () {
      init(OneRangeVis(), fixtures.oneRangeBucket);

      var $atg = $el.find('kbn-agg-table-group').first();
      expect($atg.size()).to.be(1);
      expect($atg.attr('group')).to.be('tableGroups');
      expect($atg.isolateScope().group).to.be($atg.scope().tableGroups);
    });

    it('displays an error if the search had no hits', function () {
      init(OneRangeVis(), { hits: { total: 0, hits: [] }});

      expect($el.find('kbn-agg-table-group').size()).to.be(0);

      var $err = $el.find('.table-vis-error');
      expect($err.size()).to.be(1);
      expect($err.text().trim()).to.be('No results found');
    });

    it('displays an error if the search hits, but didn\'t create any rows', function () {
      var visParams = {
        showPartialRows: false,
        metricsAtAllLevels: true
      };

      var resp = _.cloneDeep(fixtures.threeTermBuckets);
      resp.aggregations.agg_2.buckets.forEach(function (extensionBucket) {
        extensionBucket.agg_3.buckets.forEach(function (countryBucket) {
          // clear all the machine os buckets
          countryBucket.agg_4.buckets = [];
        });
      });

      init(ThreeTermVis(visParams), resp);

      expect($el.find('kbn-agg-table-group').size()).to.be(0);

      var $err = $el.find('.table-vis-error');
      expect($err.size()).to.be(1);
      expect($err.text().trim()).to.be('No results found');
    });
  }];
});