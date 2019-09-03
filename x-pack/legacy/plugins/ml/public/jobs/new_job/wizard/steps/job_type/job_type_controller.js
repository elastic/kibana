/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Controller for the second step in the Create Job wizard, allowing
 * the user to select the type of job they wish to create.
 */

import uiRoutes from 'ui/routes';
import { i18n } from '@kbn/i18n';
import { checkLicenseExpired } from 'plugins/ml/license/check_license';
import { checkCreateJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { getCreateJobBreadcrumbs } from 'plugins/ml/jobs/breadcrumbs';
import { SearchItemsProvider } from 'plugins/ml/jobs/new_job/utils/new_job_utils';
import { loadCurrentIndexPattern, loadCurrentSavedSearch, timeBasedIndexCheck } from 'plugins/ml/util/index_utils';
import { addItemToRecentlyAccessed } from 'plugins/ml/util/recently_accessed';
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import template from './job_type.html';
import { timefilter } from 'ui/timefilter';

uiRoutes
  .when('/jobs/new_job/step/job_type', {
    template,
    k7Breadcrumbs: getCreateJobBreadcrumbs,
    resolve: {
      CheckLicense: checkLicenseExpired,
      privileges: checkCreateJobsPrivilege,
      indexPattern: loadCurrentIndexPattern,
      savedSearch: loadCurrentSavedSearch,
      checkMlNodesAvailable,
    }
  });


import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlNewJobStepJobType',
  function ($scope, Private) {

    timefilter.disableTimeRangeSelector(); // remove time picker from top of page
    timefilter.disableAutoRefreshSelector(); // remove time picker from top of page

    const createSearchItems = Private(SearchItemsProvider);
    const {
      indexPattern,
      savedSearch } = createSearchItems();

    // check to see that the index pattern is time based.
    // if it isn't, display a warning and disable all links
    $scope.indexWarningTitle = '';
    $scope.isTimeBasedIndex = timeBasedIndexCheck(indexPattern);
    if ($scope.isTimeBasedIndex === false) {
      $scope.indexWarningTitle = (savedSearch.id === undefined) ?
        i18n.translate('xpack.ml.newJob.wizard.jobType.indexPatternNotTimeBasedMessage', {
          defaultMessage: 'Index pattern {indexPatternTitle} is not time based',
          values: { indexPatternTitle: indexPattern.title }
        })
        : i18n.translate('xpack.ml.newJob.wizard.jobType.indexPatternFromSavedSearchNotTimeBasedMessage', {
          defaultMessage: '{savedSearchTitle} uses index pattern {indexPatternTitle} which is not time based',
          values: {
            savedSearchTitle: savedSearch.title,
            indexPatternTitle: indexPattern.title
          }
        });
    }

    $scope.indexPattern = indexPattern;
    $scope.savedSearch = savedSearch;
    $scope.recognizerResults = {
      count: 0,
      onChange() {
        $scope.$applyAsync();
      }
    };

    $scope.pageTitleLabel = (savedSearch.id !== undefined) ?
      i18n.translate('xpack.ml.newJob.wizard.jobType.savedSearchPageTitleLabel', {
        defaultMessage: 'saved search {savedSearchTitle}',
        values: { savedSearchTitle: savedSearch.title }
      })
      : i18n.translate('xpack.ml.newJob.wizard.jobType.indexPatternPageTitleLabel', {
        defaultMessage: 'index pattern {indexPatternTitle}',
        values: { indexPatternTitle: indexPattern.title }
      });

    $scope.getUrl = function (basePath) {
      return (savedSearch.id === undefined) ? `${basePath}?index=${indexPattern.id}` :
        `${basePath}?savedSearchId=${savedSearch.id}`;
    };

    $scope.addSelectionToRecentlyAccessed = function () {
      const title = (savedSearch.id === undefined) ? indexPattern.title : savedSearch.title;
      const url = $scope.getUrl('');
      addItemToRecentlyAccessed('jobs/new_job/datavisualizer', title, url);
    };

  });
