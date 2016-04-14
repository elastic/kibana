define(function (require) {
  require('ui/modules')
    .get('kibana')
    .directive('parseQuery', function (Private) {
      let fromUser = Private(require('ui/parse_query/lib/from_user'));
      let toUser = require('ui/parse_query/lib/to_user');

      return {
        restrict: 'A',
        require: 'ngModel',
        scope: {
          'ngModel': '='
        },
        link: function ($scope, elem, attr, ngModel) {
          let init = function () {
            $scope.ngModel = fromUser($scope.ngModel);
          };

          ngModel.$parsers.push(fromUser);
          ngModel.$formatters.push(toUser);

          init();
        }
      };
    });
});
