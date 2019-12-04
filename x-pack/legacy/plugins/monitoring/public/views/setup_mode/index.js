/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';
import template from './index.html';
import { toggleSetupMode, initSetupModeState } from '../../lib/setup_mode';

uiRoutes.when('/setup-mode', {
  template,
  controller: class {
    constructor($injector, $scope) {
      const kbnUrl = $injector.get('kbnUrl');
      initSetupModeState($scope, $injector);
      toggleSetupMode(true);
      kbnUrl.changePath('/');
    }
  },
});
