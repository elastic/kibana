import { uiModules } from 'ui/modules';
import { sortPrefixFirst } from '../utils/sort_prefix_first';

uiModules
  .get('kibana')
  .filter('sortPrefixFirst', function () {
    return sortPrefixFirst;
  });
