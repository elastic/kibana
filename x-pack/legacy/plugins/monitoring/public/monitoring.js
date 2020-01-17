/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';
import chrome from 'ui/chrome';
import 'ui/kbn_top_nav';
import 'ui/directives/storage';
import 'ui/autoload/all';
import 'plugins/monitoring/filters';
import 'plugins/monitoring/services/clusters';
import 'plugins/monitoring/services/features';
import 'plugins/monitoring/services/executor';
import 'plugins/monitoring/services/license';
import 'plugins/monitoring/services/title';
import 'plugins/monitoring/services/breadcrumbs';
import 'plugins/monitoring/directives/all';
import 'plugins/monitoring/views/all';

const uiSettings = chrome.getUiSettingsClient();

// default timepicker default to the last hour
uiSettings.overrideLocalDefault(
  'timepicker:timeDefaults',
  JSON.stringify({
    from: 'now-1h',
    to: 'now',
    mode: 'quick',
  })
);

// default autorefresh to active and refreshing every 10 seconds
uiSettings.overrideLocalDefault(
  'timepicker:refreshIntervalDefaults',
  JSON.stringify({
    pause: false,
    value: 10000,
  })
);

// Enable Angular routing
uiRoutes.enable();
