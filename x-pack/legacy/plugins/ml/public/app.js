/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import the uiExports that we want to "use"
import 'uiExports/fieldFormats';
import 'uiExports/savedObjectTypes';

import 'ui/courier';
import 'ui/autoload/all';

// needed to make syntax highlighting work in ace editors
import 'ace';

import 'plugins/ml/access_denied';
import 'plugins/ml/jobs';
import 'plugins/ml/overview';
import 'plugins/ml/services/calendar_service';
import 'plugins/ml/data_frame_analytics';
import 'plugins/ml/datavisualizer';
import 'plugins/ml/explorer';
import 'plugins/ml/timeseriesexplorer';
import 'plugins/ml/components/navigation_menu';
import 'plugins/ml/components/loading_indicator';
import 'plugins/ml/settings';

import uiRoutes from 'ui/routes';

if (typeof uiRoutes.enable === 'function') {
  uiRoutes.enable();
}

uiRoutes.otherwise({
  redirectTo: '/overview',
});
