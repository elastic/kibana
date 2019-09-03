/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import template from './chart_tooltip.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { mlChartTooltipService } from './chart_tooltip_service';

module.directive('mlChartTooltip', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    link: function (scope, element) {
      mlChartTooltipService.element = element;
    }
  };
});
