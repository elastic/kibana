/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreStart, CoreSetup } from 'src/core/public';
// @ts-ignore
import { wrapInI18nContext } from 'ui/i18n';
// @ts-ignore
import { Start as InspectorStartContract } from 'src/plugins/inspector/public';
// @ts-ignore
import { MapListing } from './components/map_listing';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import {
  setLicenseId,
  setInspector,
  setFileUpload,
  setIndexPatternSelect,
  setHttp,
  setTimeFilter,
  setUiSettings,
  setInjectedVarFunc,
  setToasts,
  setIndexPatternService,
  setAutocompleteService,
  // @ts-ignore
} from './kibana_services';
// @ts-ignore
import { setInjectedVarFunc as npSetInjectedVarFunc } from '../../../../plugins/maps/public/kibana_services'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { HomePublicPluginSetup } from '../../../../../src/plugins/home/public';
import { LicensingPluginSetup } from '../../../../plugins/licensing/public';
import { featureCatalogueEntry } from './feature_catalogue_entry';
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

export const bindSetupCoreAndPlugins = (core: CoreSetup, plugins: any) => {
  const { licensing } = plugins;
  const { injectedMetadata, http } = core;
  if (licensing) {
    licensing.license$.subscribe(({ uid }: { uid: string }) => setLicenseId(uid));
  }
  setInjectedVarFunc(injectedMetadata.getInjectedVar);
  setHttp(http);
  setUiSettings(core.uiSettings);
  setInjectedVarFunc(core.injectedMetadata.getInjectedVar);
  npSetInjectedVarFunc(core.injectedMetadata.getInjectedVar);
  setToasts(core.notifications.toasts);
};

export const bindStartCoreAndPlugins = (core: CoreStart, plugins: any) => {
  const { file_upload, data, inspector } = plugins;
  setInspector(inspector);
  setFileUpload(file_upload);
  setIndexPatternSelect(data.ui.IndexPatternSelect);
  setTimeFilter(data.query.timefilter.timefilter);
  setIndexPatternService(data.indexPatterns);
  setAutocompleteService(data.autocomplete);
};

/** @internal */
export class MapsPlugin implements Plugin<MapsPluginSetup, MapsPluginStart> {
  public setup(core: CoreSetup, { __LEGACY: { uiModules }, np }: MapsPluginSetupDependencies) {
    uiModules
      .get('app/maps', ['ngRoute', 'react'])
      .directive('mapListing', function (reactDirective: any) {
        return reactDirective(wrapInI18nContext(MapListing));
      });

    bindSetupCoreAndPlugins(core, np);

    np.home.featureCatalogue.register(featureCatalogueEntry);
  }

  public start(core: CoreStart, plugins: MapsPluginStartDependencies) {
    bindStartCoreAndPlugins(core, plugins);
  }
}
