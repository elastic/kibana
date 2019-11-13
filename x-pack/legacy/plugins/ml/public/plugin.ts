/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import the uiExports that we want to "use"
import 'uiExports/fieldFormats';
import 'uiExports/savedObjectTypes';

import 'ui/autoload/all';

// needed to make syntax highlighting work in ace editors
import 'ace';

import 'plugins/ml/access_denied';
import 'plugins/ml/jobs';
import 'plugins/ml/overview';
import 'plugins/ml/services/calendar_service';
import 'plugins/ml/data_frame_analytics';
import 'plugins/ml/datavisualizer';
import 'plugins/ml/explorer';
import 'plugins/ml/timeseriesexplorer';
import 'plugins/ml/components/navigation_menu';
import 'plugins/ml/components/loading_indicator';
import 'plugins/ml/settings';

import uiRoutes from 'ui/routes';

import { Core, Plugins } from './shim';

import { DocumentationLinksService } from './services/documentation_links_service';

export interface MlPluginStart {
  documentationLinksService: {
    getElasticWebsiteUrl: () => string;
    getEsDocBasePath: () => string;
    getKQLDocUrl: () => string;
    getRulesDocUrl: () => string;
  };
}

export class Plugin {
  private readonly documentationLinksService = new DocumentationLinksService();

  public setup(core: Core, plugins: Plugins): void {
    // Initialize services
    this.documentationLinksService.setup(core, plugins);
  }

  public start(core: Core, plugins: Plugins): MlPluginStart {
    // Contents from legacy app.js moved into here.
    if (typeof uiRoutes.enable === 'function') {
      uiRoutes.enable();
    }

    uiRoutes.otherwise({
      redirectTo: '/overview',
    });

    // Return services
    return {
      documentationLinksService: this.documentationLinksService.start(),
    };
  }

  public stop() {}
}
