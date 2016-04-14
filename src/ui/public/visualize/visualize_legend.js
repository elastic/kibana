define(function (require) {
  let _ = require('lodash');
  let html = require('ui/visualize/visualize_legend.html');

  let $ = require('jquery');
  let d3 = require('d3');
  let findByParam = require('ui/utils/find_by_param');

  require('ui/modules').get('kibana')
  .directive('visualizeLegend', function (Private, getAppState) {
    let Data = Private(require('ui/vislib/lib/data'));
    let colorPalette = Private(require('ui/vislib/components/color/color'));
    let filterBarClickHandler = Private(require('ui/filter_bar/filter_bar_click_handler'));

    return {
      restrict: 'E',
      template: html,
      link: function ($scope, $elem) {
        let $state = getAppState();
        let clickHandler = filterBarClickHandler($state);
        $scope.open = $scope.uiState.get('vis.legendOpen', true);

        $scope.$watch('renderbot.chartData', function (data) {
          if (!data) return;
          $scope.data = data;
          refresh();
        });

        $scope.highlight = function (event) {
          let el = event.currentTarget;
          let handler = $scope.renderbot.vislibVis.handler;
          if (!handler) return;
          handler.highlight.call(el, handler.el);
        };

        $scope.unhighlight = function (event) {
          let el = event.currentTarget;
          let handler = $scope.renderbot.vislibVis.handler;
          if (!handler) return;
          handler.unHighlight.call(el, handler.el);
        };

        $scope.setColor = function (label, color) {
          let colors = $scope.uiState.get('vis.colors') || {};
          colors[label] = color;
          $scope.uiState.set('vis.colors', colors);
          refresh();
        };

        $scope.toggleLegend = function () {
          let bwcAddLegend = $scope.renderbot.vislibVis._attr.addLegend;
          let bwcLegendStateDefault = bwcAddLegend == null ? true : bwcAddLegend;
          $scope.open = !$scope.uiState.get('vis.legendOpen', bwcLegendStateDefault);
          $scope.uiState.set('vis.legendOpen', $scope.open);
        };

        $scope.filter = function (legendData, negate) {
          clickHandler({point: legendData, negate: negate});
        };

        $scope.canFilter = function (legendData) {
          let filters = clickHandler({point: legendData}, true) || [];
          return filters.length;
        };

        $scope.colors = [
          '#3F6833', '#967302', '#2F575E', '#99440A', '#58140C', '#052B51', '#511749', '#3F2B5B', //6
          '#508642', '#CCA300', '#447EBC', '#C15C17', '#890F02', '#0A437C', '#6D1F62', '#584477', //2
          '#629E51', '#E5AC0E', '#64B0C8', '#E0752D', '#BF1B00', '#0A50A1', '#962D82', '#614D93', //4
          '#7EB26D', '#EAB839', '#6ED0E0', '#EF843C', '#E24D42', '#1F78C1', '#BA43A9', '#705DA0', // Normal
          '#9AC48A', '#F2C96D', '#65C5DB', '#F9934E', '#EA6460', '#5195CE', '#D683CE', '#806EB7', //5
          '#B7DBAB', '#F4D598', '#70DBED', '#F9BA8F', '#F29191', '#82B5D8', '#E5A8E2', '#AEA2E0', //3
          '#E0F9D7', '#FCEACA', '#CFFAFF', '#F9E2D2', '#FCE2DE', '#BADFF4', '#F9D9F9', '#DEDAF7'  //7
        ];

        function refresh() {
          let vislibVis = $scope.renderbot.vislibVis;

          if ($scope.uiState.get('vis.legendOpen') == null && vislibVis._attr.addLegend != null) {
            $scope.open = vislibVis._attr.addLegend;
          }

          $scope.labels = getLabels($scope.data, vislibVis._attr.type);
          $scope.getColor = colorPalette(_.pluck($scope.labels, 'label'), $scope.uiState.get('vis.colors'));
        }

        // Most of these functions were moved directly from the old Legend class. Not a fan of this.
        function getLabels(data, type) {
          if (!data) return [];
          data = data.columns || data.rows || [data];
          if (type === 'pie') return Data.prototype.pieNames(data);
          return getSeriesLabels(data);
        };

        function getSeriesLabels(data) {
          let values = data.map(function (chart) {
            return chart.series;
          })
          .reduce(function (a, b) {
            return a.concat(b);
          }, []);
          return _.compact(_.uniq(values, 'label'));
        }


      }
    };
  });
});
