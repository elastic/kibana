import _ from 'lodash';
import chrome from 'ui/chrome/chrome';
import breadCrumbsTemplate from './bread_crumbs.html';
import uiModules from 'ui/modules';
let module = uiModules.get('kibana');

module.directive('breadCrumbs', function () {
  return {
    restrict: 'E',
    scope: {
      omitCurrentPage: '='
    },
    template: breadCrumbsTemplate,
    controller: function ($scope) {
      // Capitalize the first letter of each bread crumb.
      $scope.breadcrumbs = chrome.getBreadcrumbs().map(breadcrumb => _.startCase(breadcrumb));

      if ($scope.omitCurrentPage === true) {
        $scope.breadcrumbs.pop();
      }
    }
  };
});
