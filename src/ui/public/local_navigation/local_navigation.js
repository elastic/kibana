import _ from 'lodash';
import angular from 'angular';
import uiModules from 'ui/modules';

import 'ui/multi_transclude';
import localNavigationTemplate from './local_navigation.html';


const module = uiModules.get('kibana');

module.directive('localNavigation', function LocalNavigation() {
  return {
    restrict: 'E',
    template: localNavigationTemplate,
    transclude: true,
  };
});
