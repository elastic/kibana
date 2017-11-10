import { uiModules } from 'ui/modules';
import { words, capitalize } from 'ui/lodash';

uiModules
  .get('kibana')
  .filter('label', function () {
    return function (str) {
      return words(str).map(capitalize).join(' ');
    };
  });
