/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';

import React from 'react';
import ReactDOM from 'react-dom';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import chrome from 'ui/chrome';
import { timefilter } from 'ui/timefilter';
import { timeHistory } from 'ui/timefilter/time_history';
import { I18nContext } from 'ui/i18n';

import '../components/controls';

import { NavigationMenuContext } from '../util/context_utils';

import { TimeSeriesExplorer } from './timeseriesexplorer';

module.directive('mlTimeSeriesExplorer', function ($injector) {
  function link($scope, $element) {
    const mlJobSelectService = $injector.get('mlJobSelectService');
    const globalState = $injector.get('globalState');
    const AppState = $injector.get('AppState');
    const config = $injector.get('config');

    function updateComponent() {
      // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
      const tzConfig = config.get('dateFormat:tz');
      const dateFormatTz = (tzConfig !== 'Browser') ? tzConfig : moment.tz.guess();

      ReactDOM.render(
        <I18nContext>
          <NavigationMenuContext.Provider value={{ chrome, timefilter, timeHistory }}>
            <TimeSeriesExplorer {...{
              AppState,
              dateFormatTz,
              globalState,
              mlJobSelectService,
              timefilter,
            }}
            />
          </NavigationMenuContext.Provider>
        </I18nContext>,
        $element[0]
      );
    }

    $element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode($element[0]);
    });

    updateComponent();
  }

  return {
    scope: false,
    link,
  };
});
