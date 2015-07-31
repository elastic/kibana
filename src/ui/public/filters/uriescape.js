define(function (require) {
  require('ui/modules')
    .get('kibana')
    .filter('uriescape', function () {
      return function (str) {
        return encodeURIComponent(str);
      };
    });
});
