import _ from 'lodash';
import uiModules from 'ui/modules';
import toasterTemplate from 'ui/notify/partials/toaster.html';
import 'ui/notify/notify.less';
import 'ui/filters/markdown';
import 'ui/directives/truncated';

let notify = uiModules.get('kibana/notify');

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
