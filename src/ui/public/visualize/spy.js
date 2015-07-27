define(function (require) {
  require('ui/modules')
    .get('app/visualize')
    .directive('visualizeSpy', function (Private, $compile) {
      var $ = require('jquery');
      var _ = require('lodash');

      var modes = Private(require('ui/registry/spy_modes'));
      var defaultMode = modes.inOrder[0];

      return {
        restrict: 'E',
        template: require('ui/visualize/spy.html'),
        link: function ($scope, $el) {
          var $container = $el.find('.visualize-spy-container');
          var fullPageSpy = false;
          $scope.modes = modes;

          $scope.toggleDisplay = function () {
            $scope.setSpyMode($scope.spy.mode ? null : defaultMode);
          };

          $scope.toggleFullPage = function () {
            fullPageSpy = $scope.spy.mode.fill = !fullPageSpy;
          };

          $scope.setSpyMode = function (newMode) {
            // allow passing in a mode name
            if (_.isString(newMode)) newMode = modes.byName[newMode];

            var current = $scope.spy.mode;
            var change = false;

            // no change
            if (current && newMode && newMode.name === current.name) return;

            // clear the current value
            if (current) {
              current.$container.remove();
              current.$scope.$destroy();
              delete $scope.spy.mode;
            }

            // no further changes
            if (!newMode) return;

            current = $scope.spy.mode = {
              // copy a couple values over
              name: newMode.name,
              display: newMode.display,
              fill: fullPageSpy,
              $scope: $scope.$new(),
              $container: $('<div class="visualize-spy-content">').appendTo($container)
            };

            current.$container.append($compile(newMode.template)(current.$scope));
            newMode.link && newMode.link(current.$scope, current.$container);
          };
        }
      };
    });
});
