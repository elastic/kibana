/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreStart, CoreSetup } from 'src/core/public';
// @ts-ignore
import { wrapInI18nContext } from 'ui/i18n';
// @ts-ignore
import { MapListing } from './components/map_listing';
// @ts-ignore
import { setInjectedVarFunc } from '../../../../plugins/maps/public/kibana_services'; // eslint-disable-line @kbn/eslint/no-restricted-paths
// @ts-ignore
import { setLicenseId, setInspector, setFileUpload } from './kibana_services';
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

export const bindSetupCoreAndPlugins = (core: CoreSetup, plugins: any) => {
  const { licensing } = plugins;
  const { injectedMetadata } = core;
  if (licensing) {
    licensing.license$.subscribe(({ uid }: { uid: string }) => setLicenseId(uid));
  }
  setInjectedVarFunc(injectedMetadata.getInjectedVar);
};

/** @internal */
export class MapsPlugin implements Plugin<MapsPluginSetup, MapsPluginStart> {
  public setup(core: CoreSetup, { __LEGACY: { uiModules }, np }: MapsPluginSetupDependencies) {
    uiModules
      .get('app/maps', ['ngRoute', 'react'])
      .directive('mapListing', function(reactDirective: any) {
        return reactDirective(wrapInI18nContext(MapListing));
      });

    bindSetupCoreAndPlugins(core, np);

    np.home.featureCatalogue.register(featureCatalogueEntry);
  }

  public start(core: CoreStart, plugins: any) {
    const { inspector, file_upload } = plugins.np;
    setInspector(inspector);
    setFileUpload(file_upload);
  }
}
