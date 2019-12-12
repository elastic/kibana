/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metadata } from 'ui/metadata';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  PackageInfo,
  Plugin,
  PluginInitializerContext
} from '../../../../../../src/core/public';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { HomePublicPluginSetup } from '../../../../../../src/plugins/home/public';
import { LicensingPluginSetup } from '../../../../../plugins/licensing/public';
import { ApmPluginContextValue } from '../context/ApmPluginContext';
import { createStaticIndexPattern } from '../services/rest/index_pattern';
import { renderApp } from './application';
import { featureCatalogueEntry } from './featureCatalogueEntry';
import { getConfigFromInjectedMetadata } from './getConfigFromInjectedMetadata';
import { setHelpExtension } from './setHelpExtension';
import { toggleAppLinkInNav } from './toggleAppLinkInNav';
import { setReadonlyBadge } from './updateBadge';

export const REACT_APP_ROOT_ID = 'react-apm-root';

export type ApmPluginSetup = void;
export type ApmPluginStart = void;

export interface ApmPluginSetupDeps {
  home: HomePublicPluginSetup;
}

export interface ApmPluginStartDeps {
  data: DataPublicPluginStart;
  licensing: LicensingPluginSetup;
}

export interface ConfigSchema {
  indexPatternTitle: string;
  serviceMapEnabled: boolean;
  ui: {
    enabled: boolean;
  };
}

export class ApmPlugin
  implements Plugin<ApmPluginSetup, ApmPluginStart, ApmPluginSetupDeps, {}> {
  constructor(
    // @ts-ignore Not using initializerContext now, but will be once NP
    // migration is complete.
    private readonly initializerContext: PluginInitializerContext<ConfigSchema>
  ) {}

  // Take the DOM element as the constructor, so we can mount the app.
  public setup(_coreSetup: CoreSetup, depsSetup: ApmPluginSetupDeps) {
    depsSetup.home.featureCatalogue.register(featureCatalogueEntry);
  }

  public start(coreStart: CoreStart, depsStart: ApmPluginStartDeps) {
    // Once we're actually an NP plugin we'll get the config from the
    // initializerContext like:
    //
    //     const config = this.initializerContext.config.get<ConfigSchema>();
    //
    // Until then we use a shim to get it from legacy injectedMetadata:
    const config = getConfigFromInjectedMetadata();

    // Once we're actually an NP plugin we'll get the package info from the
    // initializerContext like:
    //
    //     const packageInfo = this.initializerContext.env.packageInfo
    //
    // Until then we use a shim to get it from legacy metadata:
    const packageInfo = metadata as PackageInfo;

    // render APM feedback link in global help menu
    setHelpExtension(coreStart);
    setReadonlyBadge(coreStart);
    toggleAppLinkInNav(coreStart, config);

    // create static index pattern and store as saved object. Not needed by APM UI but for legacy reasons in Discover, Dashboard etc.
    createStaticIndexPattern(coreStart.http).catch(e => {
      // eslint-disable-next-line no-console
      console.log('Error fetching static index pattern', e);
    });

    const apmPluginContextValue: ApmPluginContextValue = {
      config,
      core: coreStart,
      packageInfo,
      plugins: depsStart
    };

    const params: AppMountParameters = {
      appBasePath: coreStart.http.basePath.get(),
      element: document.getElementById(REACT_APP_ROOT_ID) as HTMLElement
    };

    // Call renderApp directly here in `start`. When when we switch to NP, we'll
    // be calling the `mount` method of `core.application.register` in `setup`
    renderApp(apmPluginContextValue, params);
  }

  public stop() {}
}
