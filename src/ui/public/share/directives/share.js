const app = require('ui/modules').get('kibana');

app.directive('share', function () {
  return {
    restrict: 'E',
    scope: {
      objectType: '@',
      objectId: '@',
      setAllowEmbed: '&?allowEmbed'
    },
    template: require('ui/share/views/share.html'),
    controller: function ($scope) {
      $scope.allowEmbed = $scope.setAllowEmbed ? $scope.setAllowEmbed() : true;
    }
  };
});
