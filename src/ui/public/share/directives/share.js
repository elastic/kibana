import uiModules from 'ui/modules';
import shareTemplate from 'ui/share/views/share.html';
const app = uiModules.get('kibana');

app.directive('share', function () {
  return {
    restrict: 'E',
    scope: {
      objectType: '@',
      objectId: '@',
      setAllowEmbed: '&?allowEmbed'
    },
    template: shareTemplate,
    controller: function ($scope) {
      $scope.allowEmbed = $scope.setAllowEmbed ? $scope.setAllowEmbed() : true;
    }
  };
});
