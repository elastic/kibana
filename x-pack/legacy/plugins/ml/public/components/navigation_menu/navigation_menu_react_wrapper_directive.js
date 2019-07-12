/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import ReactDOM from 'react-dom';
import { NavigationMenu } from './navigation_menu';
import { isFullLicense } from '../../license/check_license';
import { timeHistory } from 'ui/timefilter/time_history';
import { uiModules } from 'ui/modules';
import { timefilter } from 'ui/timefilter';
const module = uiModules.get('apps/ml');
import { mlTimefilterRefresh$ } from '../../services/timefilter_refresh_service';

import 'ui/directives/kbn_href';


module.directive('mlNavMenu', function (config) {
  return {
    restrict: 'E',
    transclude: true,
    link: function (scope, element, attrs) {
      const { name } = attrs;
      let showTabs = false;

      if (name === 'jobs' ||
        name === 'settings' ||
        name === 'data_frames' ||
        name === 'datavisualizer' ||
        name === 'filedatavisualizer' ||
        name === 'timeseriesexplorer' ||
        name === 'access-denied' ||
        name === 'explorer') {
        showTabs = true;
      }

      const props = {
        dateFormat: config.get('dateFormat'),
        disableLinks: (isFullLicense() === false),
        showTabs,
        tabId: name,
        timeHistory,
        timefilter,
        forceRefresh: () => mlTimefilterRefresh$.next()
      };

      ReactDOM.render(React.createElement(NavigationMenu, props),
        element[0]
      );

      element.on('$destroy', () => {
        ReactDOM.unmountComponentAtNode(element[0]);
        scope.$destroy();
      });
    }
  };
});
