define(function (require) {
  var _ = require('lodash');
  var html = require('ui/vislib/components/legend_value/legend_value.html');

  var $ = require('jquery');
  var d3 = require('d3');

  require('ui/modules').get('kibana')
  .directive('legendValue', function (Private, getAppState) {
    var filterBarClickHandler = Private(require('ui/filter_bar/filter_bar_click_handler'));

    return {
      restrict: 'C',
      template: html,
      link: function ($scope, $elem) {

        var $state = getAppState();
        var clickHandler = filterBarClickHandler($state);

        $elem.on('mouseover', function () {
          $('[data-label]', $scope.visEl).not('[data-label="' + $scope.legendData.label + '"]').css('opacity', 0.5);
        });

        $elem.on('mouseout', function () {
          $('[data-label]', $scope.visEl).css('opacity', 1);
        });

        $scope.setColor = function (color) {
          var colors = $scope.uiState.get('vis.colors') || {};
          colors[$scope.legendData.label] = color;
          $scope.uiState.set('vis.colors', colors);
        };

        $scope.filter = function (negate) {
          clickHandler({point: $scope.legendData, negate: negate});
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


      }
    };
  });
});
