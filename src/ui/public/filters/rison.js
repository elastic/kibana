define(function (require) {
  var rison = require('ui/utils/rison');
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
