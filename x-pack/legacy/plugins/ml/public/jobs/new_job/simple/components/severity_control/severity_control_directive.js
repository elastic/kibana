/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import ReactDOM from 'react-dom';

import { SelectSeverity } from '../../../../../components/controls/select_severity/select_severity.js';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlSeverityControl', function () {
  return {
    restrict: 'AE',
    replace: false,
    scope: {
      config: '=',
    },
    link: function ($scope, $element) {

      $scope.handleThresholdChange = (th) => {
        $scope.config.threshold = th;
      };

      const props = {
        onChangeHandler: $scope.handleThresholdChange,
        classNames: 'form-control dropdown-toggle',
      };

      ReactDOM.render(
        React.createElement(SelectSeverity, props),
        $element[0]
      );
    }
  };
});
