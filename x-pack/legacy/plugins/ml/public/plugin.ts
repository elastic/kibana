/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { DataStart } from 'src/legacy/core_plugins/data/public';
import { Plugin as DataPlugin } from 'src/plugins/data/public';
import { NavigationStart } from '../../../../../src/legacy/core_plugins/navigation/public';
import { Plugin, CoreStart, CoreSetup } from '../../../../../src/core/public';

export interface MlSetupDependencies {
  // data: DataStart;
  npData: ReturnType<DataPlugin['start']>;
  navigation: NavigationStart;
  __LEGACY?: {
    // angularDependencies: LegacyAngularInjectedDependencies;
  };
}

export interface MlStartDependencies {
  __LEGACY: {
    Storage: any;
    xpackInfo: any;
  };
}

// export interface Dependencies {
//   uiSettings: UiSettingsClientContract;
//   // savedObjectsClient: SavedObjectsClientContract;
//   // http: HttpServiceBase;
//   // notifications: NotificationsStart;
//   // fieldFormats: FieldFormatsStart;
// }

export class MlPlugin implements Plugin<MlPluginSetup, MlPluginStart> {
  // private dataStart: DataStart | null = null;
  // private npDataStart: ReturnType<DataPlugin['start']> | null = null;

  setup(core: CoreSetup, { /* data,*/ npData, navigation }: MlSetupDependencies) {
    // this.dataStart = data;
    // this.npDataStart = npData;

    core.application.register({
      id: 'ml',
      title: 'Machine learning',
      async mount(context, params) {
        const { renderApp } = await import('./application/app');
        return renderApp(context, {
          ...params,
          indexPatterns: npData.indexPatterns.indexPatterns,
          npData,
          // data,
        });
      },
    });

    return {};
  }

  start(core: CoreStart, deps: {}) {
    // this.dataStart = data;
    // this.npDataStart = npData;
    return {};
  }
  public stop() {}
}

export type MlPluginSetup = ReturnType<MlPlugin['setup']>;
export type MlPluginStart = ReturnType<MlPlugin['start']>;
