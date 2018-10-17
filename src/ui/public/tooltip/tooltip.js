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

import html from './tooltip.html';
import chrome from 'ui/chrome';

require('ui-bootstrap')
  .config(function ($tooltipProvider) {
    // we use the uiSettings client because the config service is not available in the config phase
    const uiSettings = chrome.getUiSettingsClient();

    $tooltipProvider.options({
      placement: 'bottom',
      animation: !uiSettings.get('accessibility:disableAnimations'),
      popupDelay: 150,
      appendToBody: false
    });
  })
  .directive('kbnTooltip', function () {
    return {
      restrict: 'E',
      template: html,
      transclude: true,
      replace: true,
      scope: true,
      link: function ($scope, $el, attr) {
        $scope.text = attr.text;
        $scope.placement = attr.placement || 'top';
        $scope.delay = attr.delay || 400;
        $scope.appendToBody = attr.appendToBody || 0;
      }
    };
  });
