define(function (require) {
  describe('Vislib rendering of inefficient data', function () {
    var _ = require('lodash');
    var $ = require('jquery');

    var visTypes;
    var Vis;
    var indexPattern;
    var $rootScope;
    var $compile;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector) {
      visTypes = Private(require('registry/vis_types'));
      Vis = Private(require('components/vis/vis'));
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      $rootScope = $injector.get('$rootScope');
      $compile = $injector.get('$compile');
    }));

    // create test elements
    var $els = [];
    $els.create = function (html) {
      var $el = $(html || '<div>').appendTo('body');
      $els.push($el);
      return $el;
    };

    // create test $scopes
    var $scopes = [];
    $scopes.create = function () {
      var $scope = $rootScope.$new();
      $scopes.push($scope);
      return $scope;
    };

    // clean up the test elements and $scopes
    afterEach(function () {
      _.invoke($scopes, '$destroy');
      _.invoke($els, 'remove');
      $els.splice(0, $els.length);
    });

    describe('each vis', function () {
      it.only('can be rendered with an empty elasticsearch response', function () {
        visTypes.forEach(function (visType) {
          var vis = new Vis(indexPattern, {
            type: visType,
            aggs: []
          });

          var $el = $els.create('<visualize vis="vis">');
          var $scope = $scopes.create();
          $scope.vis = vis;
          $compile($el)($scope);

          var $visualize = $el.isolateScope();
          $visualize.esResp = {
            hits: {
              total: 0,
              hits: []
            }
          };
          $scope.$apply();

          var $err = $el.find('.visualize-error');
          expect($err.size()).to.be(1);
          expect($err.text().trim()).to.be('No results found');
        });
      });
    });
  });
});