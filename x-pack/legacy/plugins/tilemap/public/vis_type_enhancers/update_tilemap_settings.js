/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import 'ui/vis/map/service_settings';

uiRoutes.addSetupWork(function($injector, serviceSettings) {
  const tileMapPluginInfo = xpackInfo.get('features.tilemap');

  if (!tileMapPluginInfo) {
    return;
  }

  if (!tileMapPluginInfo.license.active || !tileMapPluginInfo.license.valid) {
    return;
  }
  serviceSettings.addQueryParams({ license: tileMapPluginInfo.license.uid });
  serviceSettings.disableZoomMessage();
});
