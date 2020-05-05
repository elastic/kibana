/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreStart, CoreSetup } from 'src/core/public';
// @ts-ignore
import { Start as InspectorStartContract } from 'src/plugins/inspector/public';
// @ts-ignore
import { wrapInI18nContext } from 'ui/i18n';
// @ts-ignore
import { MapListing } from '../../../../plugins/maps/public/components/map_listing'; // eslint-disable-line @kbn/eslint/no-restricted-paths
// @ts-ignore
import {
  bindSetupCoreAndPlugins as bindNpSetupCoreAndPlugins,
  bindStartCoreAndPlugins as bindNpStartCoreAndPlugins,
} from '../../../../plugins/maps/public/plugin'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { HomePublicPluginSetup } from '../../../../../src/plugins/home/public';
import { LicensingPluginSetup } from '../../../../plugins/licensing/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export type MapsPluginSetup = ReturnType<MapsPlugin['setup']>;
export type MapsPluginStart = ReturnType<MapsPlugin['start']>;

interface MapsPluginSetupDependencies {
  __LEGACY: any;
  np: {
    licensing?: LicensingPluginSetup;
    home: HomePublicPluginSetup;
    data: DataPublicPluginSetup;
  };
}

interface MapsPluginStartDependencies {
  data: DataPublicPluginStart;
  inspector: InspectorStartContract;
  // file_upload TODO: Export type from file upload and use here
}

/** @internal */
export class MapsPlugin implements Plugin<MapsPluginSetup, MapsPluginStart> {
  public setup(core: CoreSetup, { __LEGACY: { uiModules }, np }: MapsPluginSetupDependencies) {
    uiModules
      .get('app/maps', ['ngRoute', 'react'])
      .directive('mapListing', function(reactDirective: any) {
        return reactDirective(wrapInI18nContext(MapListing));
      });

    bindNpSetupCoreAndPlugins(core, np);
  }

  public start(core: CoreStart, plugins: MapsPluginStartDependencies) {
    bindNpStartCoreAndPlugins(core, plugins);
  }
}
