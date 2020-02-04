/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin, Logger, PluginInitializerContext } from 'src/core/server';

import { PLUGIN } from '../../common';
import { Dependencies } from './types';

import { addIndexManagementDataEnricher } from './index_management_data';
import { ApiRoutes } from './routes';
import { License } from './services';

export interface IndexMgmtSetup {
  addIndexManagementDataEnricher: (enricher: any) => void;
}

export class IndexMgmtServerPlugin implements Plugin<IndexMgmtSetup, void, any, any> {
  private readonly apiRoutes = new ApiRoutes();
  private readonly license: License;
  private log: Logger;

  constructor({ logger }: PluginInitializerContext) {
    this.log = logger.get();
    this.license = new License(this.log);
  }

  setup({ http }: CoreSetup, { licensing }: Dependencies): IndexMgmtSetup {
    const router = http.createRouter();

    this.license.setup(
      { pluginId: PLUGIN.id, minimumLicenseType: PLUGIN.minimumLicenseType },
      { licensing }
    );

    this.apiRoutes.setup({
      router,
      plugins: {
        license: this.license,
      },
    });

    return {
      addIndexManagementDataEnricher,
    };
  }

  start() {}
  stop() {}
}
