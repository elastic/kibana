import _ from 'lodash';
define(function (require) {
  var notify = require('ui/modules').get('kibana/notify');

  notify.directive('kbnNotifications', function () {
    return {
      restrict: 'E',
      scope: {
        list: '=list'
      },
      replace: true,
      template: require('ui/notify/partials/toaster.html')
    };
  });
});
