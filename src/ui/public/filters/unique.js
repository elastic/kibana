// Filters out all duplicate items in an array
define(function (require) {
  let _ = require('lodash');

  require('ui/modules')
    .get('kibana')
    .filter('unique', function () {
      return function (arr) {
        let list = _.unique(arr);
        return list;
      };
    });
});
