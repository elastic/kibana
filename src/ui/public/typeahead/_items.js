import _ from 'lodash';
import listTemplate from 'ui/typeahead/partials/typeahead-items.html';
import 'ui/notify/directives';
define(function (require) {
  var typeahead = require('ui/modules').get('kibana/typeahead');


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
