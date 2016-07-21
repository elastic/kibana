define(function (require) {
  var _ = require('lodash');
  var typeahead = require('ui/modules').get('kibana/typeahead');
  var listTemplate = require('ui/typeahead/partials/typeahead-items.html');

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
