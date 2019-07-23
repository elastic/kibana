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

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { I18nContext } from 'ui/i18n';

import chrome from 'ui/chrome';
import { timefilter } from 'ui/timefilter';
import { timeHistory } from 'ui/timefilter/time_history';

import { NavigationMenuContext } from '../util/context_utils';

import { mapScopeToProps } from './timeseriesexplorer_utils';
import { TimeSeriesExplorer } from './timeseriesexplorer';

module.directive('mlTimeseriesexplorerReactWrapper', function (config, globalState, mlJobSelectService) {
  function link(scope, element) {
    function updateComponent() {
      ReactDOM.render(
        <I18nContext>
          <NavigationMenuContext.Provider value={{ chrome, timefilter, timeHistory }}>
            <TimeSeriesExplorer {...mapScopeToProps(
              scope,
              config,
              globalState,
              mlJobSelectService,
            )}
            />
          </NavigationMenuContext.Provider>
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
