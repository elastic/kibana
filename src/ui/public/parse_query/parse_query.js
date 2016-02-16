define(function (require) {
  require('ui/modules')
    .get('kibana')
    .directive('parseQuery', function (Private) {
      var fromUser = Private(require('ui/parse_query/lib/from_user'));
      var toUser = require('ui/parse_query/lib/to_user');
      var _ = require('lodash');

      return {
        restrict: 'A',
        require: 'ngModel',
        scope: {
          'ngModel': '='
        },
        link: function ($scope, elem, attr, ngModel) {
          var init = function () {
            $scope.ngModel = fromUser($scope.ngModel);
          };

          var fieldMap;

          if ($scope.$parent.indexPattern) {
            fieldMap = _.chain($scope.$parent.indexPattern.fields).indexBy('name').value();
          }

          toUser.setIndexPattern(fieldMap);
          fromUser.setIndexPattern(fieldMap);
          fromUser.setUseLegacy(true);
          ngModel.$parsers.push(fromUser);
          ngModel.$formatters.push(toUser);

          init();
        }
      };
    });
});
