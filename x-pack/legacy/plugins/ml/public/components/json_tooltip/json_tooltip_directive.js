/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import ReactDOM from 'react-dom';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { JsonTooltip } from './json_tooltip';

// directive for placing an i icon with a popover tooltip anywhere on a page
// tooltip format: <i ml-info-icon="<the_id>" />
// the_id will match an entry in tooltips.json
module.directive('mlInfoIcon', function () {
  return {
    scope: {
      id: '@mlInfoIcon',
      position: '@'
    },
    restrict: 'AE',
    replace: false,
    link: (scope, element) => {
      const props = {
        id: scope.id,
        position: scope.position
      };

      ReactDOM.render(
        React.createElement(JsonTooltip, props),
        element[0]
      );
    }
  };
});
