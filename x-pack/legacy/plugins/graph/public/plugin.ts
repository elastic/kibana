/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// NP type imports
import { CoreSetup, CoreStart, Plugin, SavedObjectsClientContract } from 'src/core/public';
import { Plugin as DataPlugin } from 'src/plugins/data/public';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { LicensingPluginSetup } from '../../../../plugins/licensing/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../../src/plugins/navigation/public';

export interface GraphPluginStartDependencies {
  npData: ReturnType<DataPlugin['start']>;
  navigation: NavigationStart;
}

export interface GraphPluginSetupDependencies {
  licensing: LicensingPluginSetup;
}

export class GraphPlugin implements Plugin {
  private navigationStart: NavigationStart | null = null;
  private npDataStart: ReturnType<DataPlugin['start']> | null = null;
  private savedObjectsClient: SavedObjectsClientContract | null = null;

  setup(core: CoreSetup, { licensing }: GraphPluginSetupDependencies) {
    core.application.register({
      id: 'graph',
      title: 'Graph',
      mount: async ({ core: contextCore }, params) => {
        const { renderApp } = await import('./application');
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
          storage: new Storage(window.localStorage),
          capabilities: contextCore.application.capabilities.graph,
          coreStart: contextCore,
          chrome: contextCore.chrome,
          config: contextCore.uiSettings,
          toastNotifications: contextCore.notifications.toasts,
          indexPatterns: this.npDataStart!.indexPatterns,
        });
      },
    });
  }

  start(core: CoreStart, { npData, navigation }: GraphPluginStartDependencies) {
    this.navigationStart = navigation;
    this.npDataStart = npData;
    this.savedObjectsClient = core.savedObjects.client;
  }

  stop() {}
}
