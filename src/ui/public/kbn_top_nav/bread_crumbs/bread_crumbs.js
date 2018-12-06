/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import breadCrumbsTemplate from './bread_crumbs.html';
import { uiModules } from '../../modules';
import uiRouter from '../../routes';

const module = uiModules.get('kibana');

module.directive('breadCrumbs', function () {
  return {
    restrict: 'E',
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
    controller: function ($scope, config) {
      config.watch('k7design', (val) => $scope.showPluginBreadcrumbs = !val);

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

        const newBreadcrumbs = $scope.breadcrumbs
          .map(b => ({ text: b.display, href: b.href }));

        if ($scope.pageTitle) {
          newBreadcrumbs.push({ text: $scope.pageTitle });
        }
      });
    }
  };
});
