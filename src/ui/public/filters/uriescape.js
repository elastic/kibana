import { uiModules } from 'ui/modules';
uiModules
  .get('kibana')
  .filter('uriescape', function () {
    return function (str) {
      return encodeURIComponent(str);
    };
  });
