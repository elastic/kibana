define(function (require) {
  let notify = require('ui/modules').get('kibana/notify');
  let _ = require('lodash');

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
