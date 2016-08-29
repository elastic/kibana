import _ from 'lodash';
import uiModules from 'ui/modules';
// Filters out all duplicate items in an array

uiModules
  .get('kibana')
  .filter('unique', function () {
    return function (arr) {
      const list = _.unique(arr);
      return list;
    };
  });
