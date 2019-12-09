/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// NP type imports
import { CoreSetup, CoreStart, Plugin, SavedObjectsClientContract } from 'src/core/public';
import { Plugin as DataPlugin } from 'src/plugins/data/public';
import { LegacyAngularInjectedDependencies } from './render_app';
import { NavigationStart } from '../../../../../src/legacy/core_plugins/navigation/public';
import { LicensingPluginSetup } from '../../../../plugins/licensing/common/types';

export interface GraphPluginStartDependencies {
  npData: ReturnType<DataPlugin['start']>;
  navigation: NavigationStart;
}

export interface GraphPluginSetupDependencies {
  __LEGACY: {
    Storage: any;
  };
  licensing: LicensingPluginSetup;
}

export interface GraphPluginStartDependencies {
  __LEGACY: {
    angularDependencies: LegacyAngularInjectedDependencies;
  };
}

export class GraphPlugin implements Plugin {
  private navigationStart: NavigationStart | null = null;
  private npDataStart: ReturnType<DataPlugin['start']> | null = null;
  private savedObjectsClient: SavedObjectsClientContract | null = null;
  private angularDependencies: LegacyAngularInjectedDependencies | null = null;

  setup(core: CoreSetup, { __LEGACY: { Storage }, licensing }: GraphPluginSetupDependencies) {
    core.application.register({
      id: 'graph',
      title: 'Graph',
      mount: async ({ core: contextCore }, params) => {
        const { renderApp } = await import('./render_app');
        return renderApp({
          ...params,
          licensing,
          navigation: this.navigationStart!,
          npData: this.npDataStart!,
          savedObjectsClient: this.savedObjectsClient!,
          addBasePath: core.http.basePath.prepend,
          getBasePath: core.http.basePath.get,
          canEditDrillDownUrls: core.injectedMetadata.getInjectedVar(
            'canEditDrillDownUrls'
          ) as boolean,
          graphSavePolicy: core.injectedMetadata.getInjectedVar('graphSavePolicy') as string,
          Storage,
          capabilities: contextCore.application.capabilities.graph,
          coreStart: contextCore,
          chrome: contextCore.chrome,
          config: contextCore.uiSettings,
          toastNotifications: contextCore.notifications.toasts,
          indexPatterns: this.npDataStart!.indexPatterns,
          ...this.angularDependencies!,
        });
      },
    });
  }

  start(
    core: CoreStart,
    { npData, navigation, __LEGACY: { angularDependencies } }: GraphPluginStartDependencies
  ) {
    this.navigationStart = navigation;
    this.npDataStart = npData;
    this.angularDependencies = angularDependencies;
    this.savedObjectsClient = core.savedObjects.client;
  }

  stop() {}
}
