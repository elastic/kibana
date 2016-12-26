import _ from 'lodash';
import html from 'ui/visualize/visualize_legend.html';
import VislibLibDataProvider from 'ui/vislib/lib/data';
import FilterBarFilterBarClickHandlerProvider from 'ui/filter_bar/filter_bar_click_handler';
import uiModules from 'ui/modules';


uiModules.get('kibana')
.directive('visualizeLegend', function (Private, getAppState) {
  const Data = Private(VislibLibDataProvider);
  const filterBarClickHandler = Private(FilterBarFilterBarClickHandlerProvider);

  return {
    restrict: 'E',
    template: html,
    link: function ($scope) {
      const $state = getAppState();
      const clickHandler = filterBarClickHandler($state);
      $scope.open = $scope.uiState.get('vis.legendOpen', true);

      $scope.$watch('renderbot.chartData', function (data) {
        if (!data) return;
        $scope.data = data;
      });

      $scope.$watch('renderbot.refreshLegend', () => {
        refresh();
      });

      $scope.highlight = function (event) {
        const el = event.currentTarget;
        const handler = $scope.renderbot.vislibVis.handler;

        //there is no guarantee that a Chart will set the highlight-function on its handler
        if (!handler || typeof handler.highlight !== 'function') {
          return;
        }
        handler.highlight.call(el, handler.el);
      };

      $scope.unhighlight = function (event) {
        const el = event.currentTarget;
        const handler = $scope.renderbot.vislibVis.handler;
        //there is no guarantee that a Chart will set the unhighlight-function on its handler
        if (!handler || typeof handler.unHighlight !== 'function') {
          return;
        }
        handler.unHighlight.call(el, handler.el);
      };

      $scope.setColor = function (label, color) {
        const colors = $scope.uiState.get('vis.colors') || {};
        if (colors[label] === color) delete colors[label];
        else colors[label] = color;
        $scope.uiState.setSilent('vis.colors', null);
        $scope.uiState.set('vis.colors', colors);
        $scope.uiState.emit('colorChanged');
        refresh();
      };

      $scope.toggleLegend = function () {
        const bwcAddLegend = $scope.vis.params.addLegend;
        const bwcLegendStateDefault = bwcAddLegend == null ? true : bwcAddLegend;
        $scope.open = !$scope.uiState.get('vis.legendOpen', bwcLegendStateDefault);
        $scope.uiState.set('vis.legendOpen', $scope.open);
      };

      $scope.getToggleLegendClasses = function () {
        switch ($scope.vis.params.legendPosition) {
          case 'top':
            return $scope.open ? 'fa-chevron-circle-up' : 'fa-chevron-circle-down';
            break;
          case 'bottom':
            return $scope.open ? 'fa-chevron-circle-down' : 'fa-chevron-circle-up';
            break;
          case 'left':
            return $scope.open ? 'fa-chevron-circle-left' : 'fa-chevron-circle-right';
            break;
          case 'right':
          default:
            return $scope.open ? 'fa-chevron-circle-right' : 'fa-chevron-circle-left';
        }
      };

      $scope.filter = function (legendData, negate) {
        clickHandler({ point: legendData, negate: negate });
      };

      $scope.canFilter = function (legendData) {
        const filters = clickHandler({ point: legendData }, true) || [];
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
        if (!$scope.renderbot) return;
        const vislibVis = $scope.renderbot.vislibVis;
        if (!vislibVis.visConfig) {
          $scope.labels = [{ label: 'loading ...' }];
          return;
        }  // make sure vislib is defined at this point

        if ($scope.uiState.get('vis.legendOpen') == null && $scope.vis.params.addLegend != null) {
          $scope.open = $scope.vis.params.addLegend;
        }

        if (vislibVis.visConfigArgs.type === 'heatmap') {
          const labels = vislibVis.getLegendLabels();
          if (labels) {
            $scope.labels = _.map(labels, label => {
              return { label: label };
            });
          }
        } else {
          $scope.labels = getLabels($scope.data, vislibVis.visConfigArgs.type);
        }

        if (vislibVis.visConfig) {
          $scope.getColor = vislibVis.visConfig.data.getColorFunc();
        }
      }

      // Most of these functions were moved directly from the old Legend class. Not a fan of this.
      function getLabels(data, type) {
        if (!data) return [];
        data = data.columns || data.rows || [data];
        if (type === 'pie') return Data.prototype.pieNames(data);
        return getSeriesLabels(data);
      }

      function getSeriesLabels(data) {
        const values = data.map(function (chart) {
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
