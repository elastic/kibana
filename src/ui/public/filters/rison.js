import rison from 'ui/utils/rison';
define(function (require) {
  var module = require('ui/modules').get('kibana');

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
});
