import _ from 'lodash';
import propFilter from 'ui/filters/_prop_filter';
// Gets all fields of a given type.
// You may also pass "*" to get all types
// Or an array of types to get all fields of that type
define(function (require) {

  require('ui/modules')
  .get('kibana')
  .filter('fieldType', function () {
    return propFilter('type');
  });
});
