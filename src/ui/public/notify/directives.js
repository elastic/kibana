import _ from 'lodash';
import uiModules from 'ui/modules';
import toasterTemplate from 'ui/notify/partials/toaster.html';
var notify = uiModules.get('kibana/notify');

notify.directive('kbnNotifications', function () {
  return {
    restrict: 'E',
    scope: {
      list: '=list'
    },
    replace: true,
    template: toasterTemplate
  };
});
