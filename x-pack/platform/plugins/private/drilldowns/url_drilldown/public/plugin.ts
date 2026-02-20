/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { urlDrilldownGlobalScopeProvider } from '@kbn/ui-actions-enhanced-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { URL_DRILLDOWN_TYPE } from '../common/constants';

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupContract {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartContract {}

export class UrlDrilldownPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies>
{
  constructor(protected readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): SetupContract {
    const startServices = createStartServicesGetter(core.getStartServices);

    plugins.embeddable.registerDrilldown(URL_DRILLDOWN_TYPE, async () => {
      const { getUrlDrilldown } = await import('./lib/get_url_drilldown');
      return getUrlDrilldown({
        externalUrl: core.http.externalUrl,
        getGlobalScope: urlDrilldownGlobalScopeProvider({ core }),
        navigateToUrl: (url: string) =>
          core.getStartServices().then(([{ application }]) => application.navigateToUrl(url)),
        getSyntaxHelpDocsLink: () =>
          startServices().core.docLinks.links.dashboard.urlDrilldownTemplateSyntax,
        getVariablesHelpDocsLink: () =>
          startServices().core.docLinks.links.dashboard.urlDrilldownVariables,
        settings: core.settings,
        theme: () => startServices().core.theme,
      });
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    return {};
  }

  public stop() {}
}
