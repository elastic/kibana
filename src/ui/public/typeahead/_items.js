define(function (require) {
  let _ = require('lodash');
  let typeahead = require('ui/modules').get('kibana/typeahead');
  let listTemplate = require('ui/typeahead/partials/typeahead-items.html');

  require('ui/notify/directives');

  typeahead.directive('kbnTypeaheadItems', function () {
    return {
      restrict: 'E',
      require: '^kbnTypeahead',
      replace: true,
      template: listTemplate,

      link: function ($scope, $el, attr, typeaheadCtrl) {
        $scope.typeahead = typeaheadCtrl;
      }
    };
  });
});
