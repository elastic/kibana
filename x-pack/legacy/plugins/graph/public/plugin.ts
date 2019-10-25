/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// NP type imports
import { CoreSetup, CoreStart, Plugin, SavedObjectsClientContract } from 'src/core/public';
import { DataStart } from 'src/legacy/core_plugins/data/public';
import { Plugin as DataPlugin } from 'src/plugins/data/public';
import { LegacyAngularInjectedDependencies } from './render_app';

export interface GraphPluginStartDependencies {
  data: DataStart;
  npData: ReturnType<DataPlugin['start']>;
}

export interface GraphPluginSetupDependencies {
  __LEGACY: {
    Storage: any;
    xpackInfo: any;
  };
}

export interface GraphPluginStartDependencies {
  __LEGACY: {
    angularDependencies: LegacyAngularInjectedDependencies;
  };
}

export class GraphPlugin implements Plugin {
  private dataStart: DataStart | null = null;
  private npDataStart: ReturnType<DataPlugin['start']> | null = null;
  private savedObjectsClient: SavedObjectsClientContract | null = null;
  private angularDependencies: LegacyAngularInjectedDependencies | null = null;

  setup(core: CoreSetup, { __LEGACY: { xpackInfo, Storage } }: GraphPluginSetupDependencies) {
    core.application.register({
      id: 'graph',
      title: 'Graph',
      mount: async ({ core: contextCore }, params) => {
        const { renderApp } = await import('./render_app');
        return renderApp({
          ...params,
          npData: this.npDataStart!,
          savedObjectsClient: this.savedObjectsClient!,
          xpackInfo,
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
          indexPatterns: this.dataStart!.indexPatterns.indexPatterns,
          ...this.angularDependencies!,
        });
      },
    });
  }

  start(
    core: CoreStart,
    { data, npData, __LEGACY: { angularDependencies } }: GraphPluginStartDependencies
  ) {
    // TODO is this really the right way? I though the app context would give us those
    this.dataStart = data;
    this.npDataStart = npData;
    this.angularDependencies = angularDependencies;
    this.savedObjectsClient = core.savedObjects.client;
  }

  stop() {}
}
