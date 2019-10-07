/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { IScope } from 'angular';
import { App } from 'kibana/public';
import { GraphPlugin } from './plugin';
import { setup as data } from '../../../../../src/legacy/core_plugins/data/public/legacy';

// Setup compatibility layer for AppService in legacy platform
npSetup.core.application.register = (app: App) => {
  require('ui/chrome').setRootController(app.id, ($scope: IScope, $element: JQLite) => {
    const element = $element[0];

    // Root controller cannot return a Promise so use an internal async function and call it
    (async () => {
      const unmount = await app.mount({ core: npStart.core }, { element, appBasePath: '' });
      $scope.$on('$destroy', () => {
        unmount();
      });
    })();
  });
};

const instance = new GraphPlugin();
instance.setup(npSetup.core, { data });
