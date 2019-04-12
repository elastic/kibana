/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/angular-bootstrap';
import html from './tooltip.html';
import chrome from 'ui/chrome';
import  { uiModules } from 'ui/modules';

uiModules.get('xpack/watcher')
  .config(function ($tooltipProvider) {
    // we use the uiSettings client because the config service is not available in the config phase
    const uiSettings = chrome.getUiSettingsClient();

    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });

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
