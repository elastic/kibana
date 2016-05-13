import _ from 'lodash';
import uiModules from 'ui/modules';
import registry from './registry';

const app = uiModules.get('kibana');
const strings = registry.all();

app.filter('resource', function () {
  return function (input) {
    return _.get(strings, input) || input;
  };
});
