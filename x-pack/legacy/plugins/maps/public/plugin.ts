/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreStart } from 'src/core/public';
// @ts-ignore
import { wrapInI18nContext } from 'ui/i18n';
// @ts-ignore
import { MapListing } from './components/map_listing';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export type MapsPluginSetup = ReturnType<MapsPlugin['setup']>;
export type MapsPluginStart = ReturnType<MapsPlugin['start']>;

/** @internal */
export class MapsPlugin implements Plugin<MapsPluginSetup, MapsPluginStart> {
  public setup(core: any, plugins: any) {
    const app = plugins.__LEGACY.uiModules.get('app/maps', ['ngRoute', 'react']);
    app.directive('mapListing', function(reactDirective: any) {
      return reactDirective(wrapInI18nContext(MapListing));
    });
  }

  public start(core: CoreStart, plugins: any) {}
}
