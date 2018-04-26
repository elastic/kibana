import { uiModules } from '../modules';
uiModules
  .get('kibana')
  .filter('uriescape', function () {
    return function (str) {
      return encodeURIComponent(str);
    };
  });
