define(function (require) {
  require('ui/modules')
    .get('app/visualize')
    .directive('visualizeSpy', function (Private, $compile) {
      let $ = require('jquery');
      let _ = require('lodash');

      let spyModes = Private(require('ui/registry/spy_modes'));
      let defaultMode = spyModes.inOrder[0].name;

      return {
        restrict: 'E',
        template: require('ui/visualize/spy.html'),
        link: function ($scope, $el) {
          let currentSpy;
          let $container = $el.find('.visualize-spy-container');
          let fullPageSpy = _.get($scope.spy, 'mode.fill', false);
          $scope.modes = spyModes;
          $scope.spy.params = $scope.spy.params || {};

          function getSpyObject(name) {
            name = _.isUndefined(name) ? $scope.spy.mode.name : name;
            fullPageSpy = (_.isNull(name)) ? false : fullPageSpy;

            return {
              name: name,
              fill: fullPageSpy,
            };
          }

          let renderSpy = function (spyName) {
            let newMode = $scope.modes.byName[spyName];

            // clear the current value
            if (currentSpy) {
              currentSpy.$container && currentSpy.$container.remove();
              currentSpy.$scope && currentSpy.$scope.$destroy();
              $scope.spy.mode = {};
              currentSpy = null;
            }

            // no further changes
            if (!newMode) return;

            // update the spy mode and append to the container
            $scope.spy.mode = getSpyObject(newMode.name);

            currentSpy = _.assign({
              $scope: $scope.$new(),
              $container: $('<div class="visualize-spy-content">').appendTo($container)
            }, $scope.spy.mode);

            currentSpy.$container.append($compile(newMode.template)(currentSpy.$scope));
            newMode.link && newMode.link(currentSpy.$scope, currentSpy.$container);
          };

          $scope.toggleDisplay = function () {
            let modeName = _.get($scope.spy, 'mode.name');
            $scope.setSpyMode(modeName ? null : defaultMode);
          };

          $scope.toggleFullPage = function () {
            fullPageSpy = !fullPageSpy;
            $scope.spy.mode = getSpyObject();
          };

          $scope.setSpyMode = function (modeName) {
            // save the spy mode to the UI state
            if (!_.isString(modeName)) modeName = null;
            $scope.spy.mode = getSpyObject(modeName);
          };

          if ($scope.uiState) {
            // sync external uiState changes
            let syncUIState = () => $scope.spy.mode = $scope.uiState.get('spy.mode');
            $scope.uiState.on('change', syncUIState);
            $scope.$on('$destroy', () => $scope.uiState.off('change', syncUIState));
          }

          // re-render the spy when the name of fill modes change
          $scope.$watchMulti([
            'spy.mode.name',
            'spy.mode.fill'
          ], function (newVals, oldVals) {
            // update the ui state, but only if it really changes
            let changedVals = newVals.filter((val) => !_.isUndefined(val)).length > 0;
            if (changedVals && !_.isEqual(newVals, oldVals)) {
              if ($scope.uiState) $scope.uiState.set('spy.mode', $scope.spy.mode);
            }

            // ensure the fill mode is synced
            fullPageSpy = _.get($scope.spy, 'mode.fill', fullPageSpy);

            renderSpy(_.get($scope.spy, 'mode.name', null));
          });
        }
      };
    });
});
