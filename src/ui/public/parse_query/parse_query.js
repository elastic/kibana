import { toUser } from 'ui/parse_query/lib/to_user';
import { fromUser } from 'ui/parse_query/lib/from_user';

import { uiModules } from 'ui/modules';
uiModules
  .get('kibana')
  .directive('parseQuery', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        'ngModel': '='
      },
      link: function ($scope, elem, attr, ngModel) {
        ngModel.$parsers.push(fromUser);
        ngModel.$formatters.push(toUser);
      }
    };
  });
