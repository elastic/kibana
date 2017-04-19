import _ from 'lodash';
import chrome from 'ui/chrome/chrome';
import breadCrumbsTemplate from './bread_crumbs.html';
import { getBreadCrumbUrls } from './bread_crumb_urls';
import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana');

module.directive('breadCrumbs', function ($location) {
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
      const breadcrumbs = chrome.getBreadcrumbs();

      if ($scope.useLinks) {
        const url = '#' + $location.path();
        $scope.breadcrumbs = getBreadCrumbUrls(breadcrumbs, url);
      } else {
        $scope.breadcrumbs = breadcrumbs.map(path => ({
          path: path,
          title: _.startCase(path)
        }));
      }
      if ($scope.omitCurrentPage === true) {
        $scope.breadcrumbs.pop();
      }
    }
  };
});
