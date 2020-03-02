/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-nocheck
import { Plugin, CoreStart } from 'src/core/public';
import { wrapInI18nContext } from 'ui/i18n';
import { MapListing } from './components/map_listing';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { setInjectedVarFunc } from '../../../../plugins/maps/public/kibana_services';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MapView } from '../../../../plugins/maps/public/inspector/views/map_view';
import { setLicenseId, setInspector } from './kibana_services';
import { HomePublicPluginSetup } from '../../../../../src/plugins/home/public';
import { LicensingPluginSetup } from '../../../../plugins/licensing/public';
import { featureCatalogueEntry } from './feature_catalogue_entry';

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
  };
}

export const bindCoreAndPlugins = ({ injectedMetadata }, { inspector }) => {
  setInspector(inspector);
  setInjectedVarFunc(injectedMetadata.getInjectedVar);
};

/** @internal */
export class MapsPlugin implements Plugin<MapsPluginSetup, MapsPluginStart> {
  public setup(core: any, { __LEGACY: { uiModules }, np }: MapsPluginSetupDependencies) {
    uiModules
      .get('app/maps', ['ngRoute', 'react'])
      .directive('mapListing', function(reactDirective: any) {
        return reactDirective(wrapInI18nContext(MapListing));
      });

    if (np.licensing) {
      np.licensing.license$.subscribe(({ uid }) => setLicenseId(uid));
    }
    np.home.featureCatalogue.register(featureCatalogueEntry);

    // NP setup
    np.inspector.registerView(MapView);

    bindCoreAndPlugins(core, np);
  }

  public start(core: CoreStart, plugins: any) {}
}
