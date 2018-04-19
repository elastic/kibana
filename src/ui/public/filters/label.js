import { uiModules } from '../modules';
import { words, capitalize } from 'lodash';

uiModules
  .get('kibana')
  .filter('label', function () {
    return function (str) {
      return words(str).map(capitalize).join(' ');
    };
  });
