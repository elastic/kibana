/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LegacyCoreStart,
  LegacyCoreSetup,
  PluginInitializerContext,
  AppMountParameters,
} from 'src/core/public';
import { PluginsStart, PluginsSetup } from 'ui/new_platform/new_platform';
import { FeatureCatalogueCategory } from '../../../../../../src/plugins/home/public';
import { UMFrontendLibs } from '../lib/lib';
import { PLUGIN } from '../../common/constants';
import { getKibanaFrameworkAdapter } from '../lib/adapters/framework/new_platform_adapter';

export interface StartObject {
  core: LegacyCoreStart;
  plugins: PluginsStart;
}

export interface SetupObject {
  core: LegacyCoreSetup;
  plugins: PluginsSetup;
}

export class Plugin {
  constructor(
    // @ts-ignore this is added to satisfy the New Platform typing constraint,
    // but we're not leveraging any of its functionality yet.
    private readonly initializerContext: PluginInitializerContext
  ) {}

  public setup(setup: SetupObject) {
    const { core, plugins } = setup;
    const { home } = plugins;
    home.featureCatalogue.register({
      category: FeatureCatalogueCategory.DATA,
      description: PLUGIN.DESCRIPTION,
      icon: 'uptimeApp',
      id: PLUGIN.ID,
      path: '/app/uptime#/',
      showOnHomePage: true,
      title: PLUGIN.TITLE,
    });
    core.application.register({
      appRoute: '/app/uptime#/',
      id: PLUGIN.ID,
      euiIconType: 'uptimeApp',
      order: 8900,
      title: 'Uptime',
      async mount(params: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const { element } = params;
        const libs: UMFrontendLibs = {
          framework: getKibanaFrameworkAdapter(coreStart, plugins),
        };
        libs.framework.render(element);
        return () => {};
      },
    });
  }
}
