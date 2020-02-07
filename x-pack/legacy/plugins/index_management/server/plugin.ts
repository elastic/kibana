/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin, Logger, PluginInitializerContext } from 'src/core/server';

import { PLUGIN } from '../common';
import { Dependencies } from './types';
import { ApiRoutes } from './routes';
import { License, IndexDataEnricher } from './services';
import { isEsError } from './lib/is_es_error';

export interface IndexMgmtSetup {
  indexDataEnricher: {
    add: IndexDataEnricher['add'];
  };
}

export class IndexMgmtServerPlugin implements Plugin<IndexMgmtSetup, void, any, any> {
  private readonly apiRoutes: ApiRoutes;
  private readonly license: License;
  private readonly logger: Logger;
  private readonly indexDataEnricher: IndexDataEnricher;

  constructor({ logger }: PluginInitializerContext) {
    this.logger = logger.get();
    this.apiRoutes = new ApiRoutes();
    this.license = new License();
    this.indexDataEnricher = new IndexDataEnricher();
  }

  setup({ http }: CoreSetup, { licensing }: Dependencies): IndexMgmtSetup {
    const router = http.createRouter();

    this.license.setup(
      {
        pluginId: PLUGIN.id,
        minimumLicenseType: PLUGIN.minimumLicenseType,
        defaultErrorMessage: i18n.translate('xpack.idxMgmt.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    this.apiRoutes.setup({
      router,
      license: this.license,
      indexDataEnricher: this.indexDataEnricher,
      lib: {
        isEsError,
      },
    });

    return {
      indexDataEnricher: {
        add: this.indexDataEnricher.add.bind(this.indexDataEnricher),
      },
    };
  }

  start() {}
  stop() {}
}
