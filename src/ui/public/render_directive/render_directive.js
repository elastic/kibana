const _ = require('lodash');
const $ = require('jquery');
const module = require('ui/modules').get('kibana/render_directive');

module.directive('renderDirective', function () {
  return {
    restrict: 'E',
    scope: {
      'definition': '='
    },
    template: function ($el, $attrs) {
      return $el.html();
    },
    controller: function ($scope, $element, $attrs, $transclude) {
      if (!$scope.definition) throw new Error('render-directive must have a definition attribute');

      const { controller, controllerAs } = $scope.definition;
      if (controller) {
        if (controllerAs) $scope[controllerAs] = this;
        $scope.$eval(controller, { $scope, $element, $attrs, $transclude });
      }
    },
    link: function ($scope, $el, $attrs) {
      const { link } = $scope.definition;
      if (link) {
        link($scope, $el, $attrs);
      }
    }
  };
});