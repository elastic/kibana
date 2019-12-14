/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * AngularJS directive wrapper for rendering Anomaly Explorer's React component.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import moment from 'moment-timezone';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { I18nContext } from 'ui/i18n';

import { jobSelectServiceFactory } from '../components/job_selector/job_select_service_utils';

import { Explorer } from './explorer';
import { EXPLORER_ACTION } from './explorer_constants';
import { explorer$ } from './explorer_dashboard_service';

module.directive('mlExplorerReactWrapper', function(config, globalState) {
  function link(scope, element) {
    const { jobSelectService, unsubscribeFromGlobalState } = jobSelectServiceFactory(globalState);
    // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
    const tzConfig = config.get('dateFormat:tz');
    const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

    ReactDOM.render(
      <I18nContext>
        <Explorer
          {...{
            appStateHandler: scope.appStateHandler,
            config,
            dateFormatTz,
            globalState,
            jobSelectService,
            TimeBuckets: scope.TimeBuckets,
          }}
        />
      </I18nContext>,
      element[0]
    );

    explorer$.next({ action: EXPLORER_ACTION.LOAD_JOBS });

    element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode(element[0]);
      scope.$destroy();
      unsubscribeFromGlobalState();
    });
  }

  return {
    scope: false,
    link,
  };
});
