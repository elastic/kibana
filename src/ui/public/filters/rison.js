import rison from 'rison-node';
import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana');

module.filter('rison', function () {
  return function (str) {
    return rison.encode(str);
  };
});

module.filter('risonDecode', function () {
  return function (str) {
    return rison.decode(str);
  };
});
