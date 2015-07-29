define(function (require) {
  require('ui/modules')
    .get('app/visualize')
    .directive('visualizeSpy', function (Private, $compile) {
      var $ = require('jquery');
      var _ = require('lodash');

      var modes = Private(require('ui/registry/spy_modes'));
      var defaultMode = modes.inOrder[0].name;

      return {
        restrict: 'E',
        template: require('ui/visualize/spy.html'),
        link: function ($scope, $el) {
          var $container = $el.find('.visualize-spy-container');
          var fullPageSpy = false;
          $scope.modes = modes;

          var renderSpy = function (spyName) {
            var newMode = modes.byName[spyName];
            var current = $scope.spy.mode;

            // clear the current value
            if (current) {
              current.$container && current.$container.remove();
              current.$scope && current.$scope.$destroy();
              $scope.spy.mode = false;
            }

            // no further changes
            if (!newMode) return;

            // update the spy mode and append to the container
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

          $scope.toggleDisplay = function () {
            var modeName = _.get($scope.spy, 'mode.name');
            $scope.setSpyMode(modeName ? null : defaultMode);
          };

          $scope.toggleFullPage = function () {
            fullPageSpy = $scope.spy.mode.fill = !fullPageSpy;
          };

          $scope.setSpyMode = function (modeName) {
            // save the spy mode to the UI state
            if (!_.isString(modeName)) return $scope.spy.name = null;
            $scope.spy.name = modeName;
          };

          $scope.$watch('spy.name', renderSpy);
        }
      };
    });
});
