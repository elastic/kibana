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

module.directive('mlTimeseriesexplorerReactWrapper', function (config, globalState, mlJobSelectService) {
  function link(scope, element) {
    function updateComponent() {
      ReactDOM.render(
        <I18nContext>
          <TimeSeriesExplorer {...mapScopeToProps(
            scope,
            config,
            globalState,
            mlJobSelectService,
          )}
          />
        </I18nContext>,
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
