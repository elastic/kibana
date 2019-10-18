/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// NP type imports
import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
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
    fatalError: any;
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
  private angularDependencies: LegacyAngularInjectedDependencies | null = null;

  setup(
    core: CoreSetup,
    { __LEGACY: { fatalError, xpackInfo, Storage } }: GraphPluginSetupDependencies
  ) {
    core.application.register({
      id: 'graph',
      title: 'Graph',
      order: 9000,
      icon: 'plugins/graph/icon.png',
      euiIconType: 'graphApp',
      mount: async (context, params) => {
        const { renderApp } = await import('./render_app');
        return renderApp(
          context,
          {
            ...params,
            data: this.dataStart!,
            npData: this.npDataStart!,
            fatalError,
            xpackInfo,
            addBasePath: core.http.basePath.prepend,
            getBasePath: core.http.basePath.get,
            Storage,
          },
          this.angularDependencies!
        );
      },
    });
  }

  start(
    _core: CoreStart,
    { data, npData, __LEGACY: { angularDependencies } }: GraphPluginStartDependencies
  ) {
    // TODO is this really the right way? I though the app context would give us those
    this.dataStart = data;
    this.npDataStart = npData;
    this.angularDependencies = angularDependencies;
  }

  stop() {}
}
