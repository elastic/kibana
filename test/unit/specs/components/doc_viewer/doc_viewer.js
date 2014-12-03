define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');
  var hit = {
    '_index': 'logstash-2014.09.09',
    '_type': 'apache',
    '_id': '61',
    '_score': 1,
    '_source': {
      'extension': 'html',
      'bytes': 100,
      'point': {lat: 7, lon: 7},
      'noMapping': 'hasNoMapping'
    }
  };

  // Load the kibana app dependencies.
  require('services/private');
  require('components/doc_viewer/doc_viewer');


  var $parentScope, $scope, indexPattern, flattened;

  var init = function ($elem, props) {
    inject(function ($rootScope, $compile) {
      $parentScope = $rootScope;
      _.assign($parentScope, props);
      $compile($elem)($parentScope);
      $elem.scope().$digest();
      $scope = $elem.isolateScope();
    });
  };

  var destroy = function () {
    $scope.$destroy();
    $parentScope.$destroy();
  };

  describe('docViewer', function () {
    var $elem;

    beforeEach(module('kibana'));
    beforeEach(function () {
      $elem = angular.element('<doc-viewer index-pattern="indexPattern" hit="hit" filter="filter"></doc-viewer>');
      inject(function (Private) {
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        flattened = indexPattern.flattenHit(hit);
      });
      init($elem, {
        indexPattern: indexPattern,
        hit: hit,
        filter: sinon.spy()
      });
    });

    afterEach(function () {
      destroy();
    });

    describe('Table mode', function () {
      it('should have a row for each field', function () {
        var rows = $elem.find('tr');
        expect($elem.find('tr').length).to.be(_.keys(flattened).length);
      });

      it('should have the field name in the first column', function () {
        _.each(_.keys(flattened), function (field) {
          expect($elem.find('td[title="' + field + '"]').length).to.be(1);
        });
      });

      it('should have the a value for each field', function () {
        _.each(_.keys(flattened), function (field) {
          var cellValue = $elem.find('td[title="' + field + '"]').siblings().find('.discover-table-details-value').text();

          // This sucks, but testing the filter chain is too hairy ATM
          expect(cellValue.length).to.be.greaterThan(0);
        });
      });


      describe('filtering', function () {

        it('should apply a filter when clicking filterable fields', function () {
          var filterCell = $elem.find('td[title="bytes"]').next();

          filterCell.find('.fa-search-plus').first().click();
          expect($scope.filter.calledOnce).to.be(true);
          filterCell.find('.fa-search-minus').first().click();
          expect($scope.filter.calledTwice).to.be(true);
        });

        it('should NOT apply a filter when clicking non-filterable fields', function () {
          var filterCell = $elem.find('td[title="point"]').next();

          filterCell.find('.fa-search-plus').first().click();
          expect($scope.filter.calledOnce).to.be(false);
          filterCell.find('.fa-search-minus').first().click();
          expect($scope.filter.calledTwice).to.be(false);
        });

      });

    });
  });
});