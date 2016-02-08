import _ from 'lodash';
import UiModules from 'ui/modules';
import chromeConfigControlsRegistry from 'ui/registry/chrome_config_controls';
import ConfigTemplate from 'ui/ConfigTemplate';

import toggleHtml from './toggle.html';

chromeConfigControlsRegistry.register(function (timefilter, globalState) {
  let pickerTemplate = new ConfigTemplate({
    filter: require('ui/timepicker/config/filter.html'),
    interval: require('ui/timepicker/config/interval.html')
  });

  var listenForUpdates = _.once(function ($scope) {
    $scope.$listen(timefilter, 'update', function (newVal, oldVal) {
      globalState.time = _.clone(timefilter.time);
      globalState.refreshInterval = _.clone(timefilter.refreshInterval);
      globalState.save();
    });
  });

  return {
    name: 'timepicker toggle',
    order: 100,
    navbar: {
      template: toggleHtml,
      controller: function ($scope) {
        listenForUpdates($scope);
        $scope.pickerTemplate = pickerTemplate;
        $scope.timefilter = timefilter;

        $scope.toggleRefresh = function () {
          timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
        };
      }
    },
    config: {
      template: pickerTemplate,
      close: pickerTemplate.close,
      object: timefilter
    }
  };
});
