/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Copied largely from plugins/kibana/public/kibana.js. The dashboard viewer includes just the dashboard section of
// the standard kibana plugin.  We don't want to include code for the other links (visualize, dev tools, etc)
// since it's view only, but we want the urls to be the same, so we are using largely the same setup.

// preloading (for faster webpack builds)
import chrome from 'ui/chrome';
import routes from 'ui/routes';
import { uiModules } from 'ui/modules';

// import the uiExports that we want to "use"
import 'uiExports/contextMenuActions';
import 'uiExports/visTypes';
import 'uiExports/visResponseHandlers';
import 'uiExports/visRequestHandlers';
import 'uiExports/inspectorViews';
import 'uiExports/interpreter';
import 'uiExports/savedObjectTypes';
import 'uiExports/embeddableActions';
import 'uiExports/embeddableFactories';
import 'uiExports/navbarExtensions';
import 'uiExports/docViews';
import 'uiExports/search';
import 'uiExports/shareContextMenuExtensions';
import _ from 'lodash';
import 'ui/autoload/all';
import 'ui/kbn_top_nav';
import 'ui/vislib';
import 'ui/agg_response';
import 'ui/agg_types';
import 'leaflet';
import { npStart } from 'ui/new_platform';
import { localApplicationService } from 'plugins/kibana/local_application_service';

import { showAppRedirectNotification } from 'ui/notify';
import { DashboardConstants, createDashboardEditUrl } from 'plugins/kibana/dashboard';

uiModules
  .get('kibana')
  .config(dashboardConfigProvider => dashboardConfigProvider.turnHideWriteControlsOn());

localApplicationService.attachToAngular(routes);

routes.enable();
routes.otherwise({ redirectTo: defaultUrl() });

chrome.setRootController('kibana', function() {
  npStart.core.chrome.navLinks.showOnly('kibana:dashboard');
});

uiModules.get('kibana').run(showAppRedirectNotification);

// If there is a configured kbnDefaultAppId, and it is a dashboard ID, we'll
// show that dashboard, otherwise, we'll show the default dasbhoard landing page.
function defaultUrl() {
  const defaultAppId = chrome.getInjected('kbnDefaultAppId', '');
  const isDashboardId = defaultAppId.startsWith(dashboardAppIdPrefix());
  return isDashboardId ? `/${defaultAppId}` : DashboardConstants.LANDING_PAGE_PATH;
}

function dashboardAppIdPrefix() {
  return _.trimLeft(createDashboardEditUrl(''), '/');
}
