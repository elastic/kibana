define(function (require) {
  var _ = require('lodash');
  var html = require('ui/vislib/components/legend_value/legend_value.html');
  var $ = require('jquery');

  require('ui/modules').get('kibana')
  .directive('legendValue', function () {
    return {
      restrict: 'C',
      template: html,
      link: function ($scope, $elem) {

        $elem.on('mouseover', function () {
          $('[data-label]', $scope.visEl).not('[data-label="' + $scope.legendData.label + '"]').css('opacity', 0.5);
        });

        $elem.on('mouseout', function () {
          $('[data-label]', $scope.visEl).css('opacity', 1);
        });


      }
    };
  });
});
