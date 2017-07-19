import _ from 'lodash';
import { uiModules } from 'ui/modules';
// Gets all fields of a given type.
// You may also pass "*" to get all types
// Or an array of types to get all fields of that type

uiModules
.get('kibana')
.filter('matchAny', function () {
  return function (items, rules) {
    if (!_.isArray(rules)) {
      rules = [rules];
    }

    return _.filter(items, function (item) {
      for (let i = 0; i < rules.length; i++) {
        if (_.some([item], rules[i])) {
          return true;
        }
      }

      return false;
    });
  };
});
