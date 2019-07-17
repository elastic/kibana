/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import ReactDOM from 'react-dom';
import { NavigationMenu } from './navigation_menu';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import 'ui/directives/kbn_href';

module.directive('mlNavMenu', function () {
  return {
    restrict: 'E',
    transclude: true,
    link: function (scope, element, attrs) {
      ReactDOM.render(React.createElement(NavigationMenu, { tabId: attrs.name }),
        element[0]
      );

      element.on('$destroy', () => {
        ReactDOM.unmountComponentAtNode(element[0]);
        scope.$destroy();
      });
    }
  };
});
