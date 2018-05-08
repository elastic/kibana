import breadCrumbsTemplate from './bread_crumbs.html';
import { uiModules } from '../../modules';
import uiRouter from '../../routes';

const module = uiModules.get('kibana');

module.directive('breadCrumbs', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      omitCurrentPage: '=',
      /**
       * Pages to omit from the breadcrumbs. Should be lower-case.
       * @type {Array}
       */
      omitPages: '=',
      /**
       * Optional title to append at the end of the breadcrumbs. Note that this can't just be
       * 'title', because that will be interpreted by browsers as an actual 'title' HTML attribute.
       * @type {String}
       */
      pageTitle: '=',
      /**
       * If true, makes each breadcrumb a clickable link.
       * @type {String}
       */
      useLinks: '='
    },
    template: breadCrumbsTemplate,
    controller: function ($scope) {

      function omitPagesFilter(crumb) {
        return (
          !$scope.omitPages ||
          !$scope.omitPages.includes(crumb.id)
        );
      }

      function omitCurrentPageFilter(crumb) {
        return !($scope.omitCurrentPage && crumb.current);
      }

      $scope.$watchMulti([
        '[]omitPages',
        'omitCurrentPage'
      ], function getBreadcrumbs() {
        $scope.breadcrumbs = (
          uiRouter
            .getBreadcrumbs()
            .filter(omitPagesFilter)
            .filter(omitCurrentPageFilter)
        );
      });
    }
  };
});
