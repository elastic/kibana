import _ from 'lodash';
import uiModules from 'ui/modules';
import stringResources from './string_resources';

const app = uiModules.get('kibana');

app.filter('resource', function () {
  return function (input) {
    return _.get(stringResources, input) || '';
  };
});
