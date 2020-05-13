/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { APP_ID } from '../../../../plugins/maps/common/constants';
import { initRoutes } from './routes';

export class MapPlugin {
  setup(core, plugins, __LEGACY) {
    const { licensing, mapsLegacy } = plugins;
    let routesInitialized = false;
    const mapConfig = mapsLegacy.config;

    licensing.license$.subscribe(license => {
      const { state } = license.check('maps', 'basic');
      if (state === 'valid' && !routesInitialized) {
        routesInitialized = true;
        initRoutes(__LEGACY, license.uid, mapConfig);
      }
    });

    __LEGACY.injectUiAppVars(APP_ID, async () => {
      return await __LEGACY.getInjectedUiAppVars('kibana');
    });
  }
}
