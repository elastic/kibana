/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * AngularJS directive wrapper for rendering Time Series Viewer's React component.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { TimeSeriesExplorer } from './timeseriesexplorer';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { I18nContext } from 'ui/i18n';
import { mapScopeToProps } from './timeseriesexplorer_utils';

module.directive('mlTimeseriesexplorerReactWrapper', function () {
  function link(scope, element) {
    function updateComponent() {
      ReactDOM.render(
        <I18nContext>{React.createElement(TimeSeriesExplorer, mapScopeToProps(scope))}</I18nContext>,
        element[0]
      );
    }

    updateComponent();

    scope.$watch(() => {
      updateComponent();
    });

    element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode(element[0]);
      scope.$destroy();
    });
  }

  return {
    scope: false,
    link,
  };
});
