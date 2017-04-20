import { propFilter } from 'ui/filters/_prop_filter';
import { uiModules } from 'ui/modules';
// Gets all fields of a given type.
// You may also pass "*" to get all types
// Or an array of types to get all fields of that type

uiModules
.get('kibana')
.filter('fieldType', function () {
  return propFilter('type');
});
