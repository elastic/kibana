import { uiModules } from 'ui/modules';
import template from './kbn_global_intervalpicker.html';
import { once, clone } from 'lodash';

uiModules
  .get('kibana')
  .directive('kbnGlobalIntervalpicker', (intervalfilter, globalState, $rootScope) => {
    const listenForUpdates = once($scope => {
      $scope.$listen(intervalfilter, 'update', () => {
        globalState.dateInterval = clone(intervalfilter.dateInterval);
        globalState.save();
      });
    });
    return {
      template: template,
      replace: true,
      require: '^kbnTopNav',
      link: ($scope, element, attributes, kbnTopNav) => {
        listenForUpdates($rootScope);
        $rootScope.intervalfilter = intervalfilter;
        $scope.updateDateInterval = (interval) => {
          intervalfilter.dateInterval = interval;
          kbnTopNav.close('date-interval');
        };
      }
    };
  });
