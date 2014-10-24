define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  // Load the kibana app dependencies.
  require('angular-route');

  // Load the code for the directive
  require('plugins/dashboard/directives/panel');

  describe('Gridster', function () {
    var $scope, $elem, compile;

    beforeEach(function () {
      module('app/dashboard');

      // Create the scope
      inject(function ($rootScope, $compile) {

        // So we can use this in other sections
        compile = $compile;

        $scope = $rootScope;

        $elem = angular.element(
          '<ul dashboard-grid="" ' +
          '  grid="dashboard.panels" ' +
          '  control="gridControl" ' +
          '  class="ng-isolate-scope gridster" ' +
          '  style="position: relative; width: 1207px; height: 220px;">' +
          '</ul>'
        );

        // The element must be attached to the DOM for gridster to work.
        $elem.hide();
        $elem.appendTo(document.body);

      });

    });

    afterEach(function () {
      $elem.remove();
    });

    describe('without parameters', function () {
      beforeEach(function () {
        compile($elem)($scope);
        $scope.$digest();
      });

      it('should return without attaching anything', function (done) {
        var panels = $elem.find('li.gs-w');
        expect(panels.length).to.be(0);
        done();
      });

    });

    describe('with parameters', function () {
      var grid;

      beforeEach(function () {
        $scope.gridControl = {};
        $scope.dashboard = {
          panels: [{
            col: 1,
            row: 1,
            size_x: 3,
            size_y: 2,
            params: {
              type: 'vis1'
            }
          }, {
            col: 4,
            row: 1,
            size_x: 3,
            size_y: 2,
            params: {
              type: 'vis2'
            }
          }]
        };

        compile($elem)($scope);
        $scope.$digest();

        grid = $scope.gridControl.serializeGrid;
      });

      it('should have 2 panels', function (done) {
        var panels = $elem.find('li.gs-w');
        expect(panels.length).to.be(2);
        done();
      });

      it('should remove panels when remove is clicked', function (done) {
        expect(grid().length).to.be(2);

        // Click close button
        $elem.find('li.gs-w:first i.remove').trigger('click');
        expect(grid().length).to.be(1);
        done();
      });

      it('should have a control.clearGrid that removes all widgets', function (done) {
        expect(grid().length).to.be(2);
        $scope.gridControl.clearGrid();
        expect(grid().length).to.be(0);
        done();
      });

      it('has an addWidget that adds a widget', function (done) {
        expect(grid().length).to.be(2);
        $scope.gridControl.addWidget({});
        expect(grid().length).to.be(3);
        done();
      });

      it('has an unserializeGrid that creates a grid from an object', function (done) {
        expect(grid().length).to.be(2);
        $scope.gridControl.clearGrid();
        expect(grid().length).to.be(0);
        $scope.gridControl.unserializeGrid({
          panels: [{
            col: 1,
            row: 1,
            size_x: 3,
            size_y: 2,
            params: {
              type: 'vis1'
            }
          }]
        });
        expect(grid().length).to.be(1);
        done();
      });

    });

  });

});