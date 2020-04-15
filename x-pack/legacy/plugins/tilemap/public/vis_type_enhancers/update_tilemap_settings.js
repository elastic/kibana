/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { npSetup } from 'ui/new_platform';

const tileMapPluginInfo = xpackInfo.get('features.tilemap');

if (tileMapPluginInfo && (tileMapPluginInfo.license.active || tileMapPluginInfo.license.valid)) {
  const { serviceSettings } = npSetup.plugins.mapsLegacy;
  serviceSettings.addQueryParams({ license: tileMapPluginInfo.license.uid });
  serviceSettings.disableZoomMessage();
}
