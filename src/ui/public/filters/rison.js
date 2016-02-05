import rison from 'ui/utils/rison';
import uiModules from 'ui/modules';
var module = uiModules.get('kibana');

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
