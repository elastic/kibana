/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// K5 imports
import { uiModules } from 'ui/modules';
import { i18n } from '@kbn/i18n';
import uiRoutes from 'ui/routes';
import 'ui/capabilities/route_setup';
import { toastNotifications } from 'ui/notify';
import { formatAngularHttpError } from 'ui/notify/lib';

// License
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';

// Our imports
import $ from 'jquery';
import _ from 'lodash';
import 'ace';
import 'angular-ui-ace';
import 'plugins/searchprofiler/directives';
import './components/searchprofiler_tabs_directive';
import { Range } from './range';
import { nsToPretty } from 'plugins/searchprofiler/filters/ns_to_pretty';
import { msToPretty } from 'plugins/searchprofiler/filters/ms_to_pretty';
import { checkForParseErrors } from 'plugins/searchprofiler/app_util.js';
import { initializeEditor } from 'plugins/searchprofiler/editor';

// Styles and templates
import 'ui/autoload/all';
import template from './templates/index.html';
import { defaultQuery } from './templates/default_query';

uiRoutes.when('/dev_tools/searchprofiler', {
  template: template,
  requireUICapability: 'dev_tools.show',
  controller: $scope => {
    $scope.registerLicenseLinkLabel = i18n.translate(
      'xpack.searchProfiler.registerLicenseLinkLabel',
      { defaultMessage: 'register a license' }
    );
    $scope.trialLicense = i18n.translate('xpack.searchProfiler.trialLicenseTitle', {
      defaultMessage: 'Trial',
    });
    $scope.basicLicense = i18n.translate('xpack.searchProfiler.basicLicenseTitle', {
      defaultMessage: 'Basic',
    });
    $scope.goldLicense = i18n.translate('xpack.searchProfiler.goldLicenseTitle', {
      defaultMessage: 'Gold',
    });
    $scope.platinumLicense = i18n.translate('xpack.searchProfiler.platinumLicenseTitle', {
      defaultMessage: 'Platinum',
    });
  },
});

uiModules
  .get('app/searchprofiler', ['ui.ace'])
  .controller('profileViz', profileVizController)
  .filter('nsToPretty', () => nsToPretty)
  .filter('msToPretty', () => msToPretty)
  .factory('HighlightService', () => {
    const service = {
      details: null,
    };
    return service;
  });

function profileVizController($scope, $timeout, $http, HighlightService) {
  $scope.title = 'Search Profile';
  $scope.description = 'Search profiling and visualization';
  $scope.profileResponse = [];
  $scope.highlight = HighlightService;
  $scope.index = '_all';
  $scope.query = '';

  // TODO this map controls which tab is active, but due to how
  // the tab directive works, we cannot use a single variable to hold the state.
  // Instead we have to map the tab name to true/false, and make sure only one
  // state is active.  This should be refactored if possible, as it could be trappy!
  $scope.activeTab = {
    search: true,
  };
  $scope.markers = [];
  $scope.licenseEnabled = xpackInfo.get('features.searchprofiler.enableAppLink');

  const editor = initializeEditor({
    el: $('#SearchProfilerInput')[0],
    licenseEnabled: $scope.licenseEnabled,
  });

  editor.on('change', () => {
    // Do a safe apply/trigger digest
    $timeout(() => {
      $scope.query = editor.getValue();
    });
  });

  editor.setValue(defaultQuery, 1);

  $scope.hasQuery = () => Boolean($scope.query);

  $scope.profile = () => {
    const { query } = $scope;
    if (!$scope.licenseEnabled) {
      return;
    }
    // Reset right detail panel
    $scope.resetHighlightPanel();
    let json = checkForParseErrors(query);
    if (json.status === false) {
      toastNotifications.addError(json.error, {
        title: i18n.translate('xpack.searchProfiler.errorToastTitle', {
          defaultMessage: 'JSON parse error',
        }),
      });
      return;
    }
    json = json.parsed;

    // If we can find the start of a profile JSON output, just try to render it
    // without executing
    if (json.profile && json.profile.shards) {
      $scope.renderProfile(json.profile.shards);
    } else {
      // Otherwise it's (probably) a regular search, execute remotely
      const requestBody = { query };
      if ($scope.index == null || $scope.index === '') {
        requestBody.index = '_all';
      } else {
        requestBody.index = $scope.index;
      }
      if (!$scope.type === '') {
        requestBody.type = $scope.type;
      }
      $scope.executeRemoteQuery(requestBody);
    }
  };

  $scope.executeRemoteQuery = requestBody => {
    $http
      .post('../api/searchprofiler/profile', requestBody)
      .then(resp => {
        if (!resp.data.ok) {
          toastNotifications.addDanger(resp.data.err.msg);

          try {
            const regex = /line=([0-9]+) col=([0-9]+)/g;
            const [, row, column] = regex.exec(resp.data.err.msg);

            $scope.markers.push(
              $scope.ace.session.addMarker(
                new Range(row - 1, 0, row - 1, column),
                'errorMarker',
                'fullLine'
              )
            );
          } catch (e) {
            // Best attempt, not a big deal if we can't highlight the line
          }

          return;
        }

        $scope.renderProfile(resp.data.resp.profile.shards);
      })
      .catch(reason => toastNotifications.addDanger(formatAngularHttpError(reason)));
  };

  $scope.renderProfile = data => {
    for (const shard of data) {
      shard.id = shard.id.match(/\[([^\]\[]*?)\]/g);
      shard.id = _.map(shard.id, id => {
        return id.replace('[', '').replace(']', '');
      });
    }
    $scope.profileResponse = data;

    const hasAggregations = data[0].aggregations != null && data[0].aggregations.length > 0;
    if (!hasAggregations) {
      // No aggs, reset back to search panel
      $scope.activateTab('search');
    }
  };

  $scope.activateTab = tab => {
    // Reset right detail panel
    $scope.resetHighlightPanel();
    // Reset active tab map
    $scope.activeTab = {};
    if (tab === 'aggregations') {
      $scope.activeTab.aggregations = true;
    } else {
      // Everything has a search, so default to this
      $scope.activeTab.search = true;
    }
  };

  $scope.resetHighlightPanel = () => {
    $scope.highlight.details = null;
  };
}
