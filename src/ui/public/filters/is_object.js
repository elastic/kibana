import uiModules from 'ui/modules';

uiModules
  .get('kibana')
  .filter('isObject', function () {
    return function (object) {
      return typeof object === 'object';
    };
  });
