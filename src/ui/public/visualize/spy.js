import $ from 'jquery';
import _ from 'lodash';
import { SpyModesRegistryProvider } from 'ui/registry/spy_modes';
import { uiModules } from 'ui/modules';
import spyTemplate from 'ui/visualize/spy.html';

uiModules
  .get('app/visualize')
  .directive('visualizeSpy', function (Private, $compile) {

    const spyModes = Private(SpyModesRegistryProvider);

    return {
      restrict: 'E',
      template: spyTemplate,
      scope: {
        vis: '<',
        spy: '<',
        searchSource: '<',
        uiState: '<'
      },
      link: function ($scope, $el) {
        let currentSpy;
        let defaultMode;
        const $container = $el.find('[data-spy-content-container]');
        let fullPageSpy = _.get($scope.spy, 'mode.fill', false);
        $scope.modes = [];
        $scope.spy.params = $scope.spy.params || {};

        /**
         * Filter for modes that should actually be active for this visualization.
         * This will call the showMode method of the mode, pass it the vis object.
         * Depending on whether or not that returns a truthy value, it will be shown
         * or not. If the method is not present, the mode will always be shown.
         */
        function filterModes() {
          $scope.modes = spyModes.inOrder.filter(mode =>
            mode.showMode ? mode.showMode($scope.vis) : true
          );
          defaultMode = $scope.modes.length > 0 ? $scope.modes[0].name : null;
        }

        filterModes();
        $scope.$watch('vis', filterModes);

        function getSpyObject(name) {
          name = _.isUndefined(name) ? $scope.spy.mode.name : name;
          fullPageSpy = (_.isNull(name)) ? false : fullPageSpy;

          return {
            name: name,
            fill: fullPageSpy,
          };
        }

        $scope.setSpyMode = function setSpyMode(modeName) {
          if (!_.isString(modeName)) modeName = null;
          $scope.spy.mode = getSpyObject(modeName);
          $scope.$emit('render');
        };

        const renderSpy = function (spyName) {
          const newMode = spyModes.byName[spyName];

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
          const selectedSpyMode = getSpyObject(newMode.name);
          $scope.spy.mode = selectedSpyMode;
          $scope.selectedModeName = selectedSpyMode.name;

          currentSpy = _.assign({
            $scope: $scope.$new(),
            $container: $('<div class="visualize-spy-content">').appendTo($container)
          }, $scope.spy.mode);

          currentSpy.$container.append($compile(newMode.template)(currentSpy.$scope));
          newMode.link && newMode.link(currentSpy.$scope, currentSpy.$container);
        };

        $scope.toggleDisplay = function () {
          const modeName = _.get($scope.spy, 'mode.name');
          $scope.setSpyMode(modeName ? null : defaultMode);
        };

        $scope.toggleFullPage = function () {
          fullPageSpy = !fullPageSpy;
          $scope.spy.mode = getSpyObject();
        };

        if ($scope.uiState) {
          // sync external uiState changes
          const syncUIState = () => $scope.spy.mode = $scope.uiState.get('spy.mode');
          $scope.uiState.on('change', syncUIState);
          $scope.$on('$destroy', () => $scope.uiState.off('change', syncUIState));
        }

        // re-render the spy when the name of fill modes change
        $scope.$watchMulti([
          'spy.mode.name',
          'spy.mode.fill'
        ], function (newVals, oldVals) {
          // update the ui state, but only if it really changes
          const changedVals = newVals.filter((val) => !_.isUndefined(val)).length > 0;
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
