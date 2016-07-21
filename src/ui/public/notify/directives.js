define(function (require) {
  var notify = require('ui/modules').get('kibana/notify');
  var _ = require('lodash');

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
