/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'uiExports/savedObjectTypes';

import 'ui/autoload/all';

// needed to make syntax highlighting work in ace editors
import 'ace';

import './access_denied';
import './jobs';
import './overview';
import './services/calendar_service';
import './data_frame_analytics';
import './datavisualizer';
import './explorer';
import './timeseriesexplorer';
import './components/navigation_menu';
import './components/loading_indicator';
import './settings';

import uiRoutes from 'ui/routes';

if (typeof uiRoutes.enable === 'function') {
  uiRoutes.enable();
}

uiRoutes
  .otherwise({
    redirectTo: '/overview'
  });
