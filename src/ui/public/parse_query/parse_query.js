import { toUser } from './lib/to_user';
import { ParseQueryLibFromUserProvider } from './lib/from_user';

import { uiModules } from '../modules';
uiModules
  .get('kibana')
  .directive('parseQuery', function (Private) {
    const fromUser = Private(ParseQueryLibFromUserProvider);

    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        'ngModel': '='
      },
      link: function ($scope, elem, attr, ngModel) {
        const init = function () {
          $scope.ngModel = fromUser($scope.ngModel);
        };

        ngModel.$parsers.push(fromUser);
        ngModel.$formatters.push(toUser);

        init();
      }
    };
  });
