/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin, Logger, PluginInitializerContext } from 'src/core/server';

import { LICENSE_CHECK_STATE } from '../../../../../plugins/licensing/common/types';
import { PLUGIN } from '../../common';
import { Dependencies, RouteDependencies, LicenseStatus } from './types';
// import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';

// import { Router } from '../../../../server/lib/create_router';
import { addIndexManagementDataEnricher } from './index_management_data';
import { registerApiRoutes } from './routes';

// export interface LegacySetup {
//   router: Router;
//   plugins: {
//     elasticsearch: ElasticsearchPlugin;
//     license: {
//       registerLicenseChecker: () => void;
//     };
//   };
// }

export interface IndexMgmtSetup {
  addIndexManagementDataEnricher: (enricher: any) => void;
}

export class IndexMgmtServerPlugin implements Plugin<IndexMgmtSetup, void, any, any> {
  licenseStatus: LicenseStatus;
  log: Logger;

  constructor({ logger }: PluginInitializerContext) {
    this.log = logger.get();
    this.licenseStatus = { isValid: false };
  }

  setup({ http }: CoreSetup, { licensing, elasticsearch }: Dependencies): IndexMgmtSetup {
    // const serverFacade = {
    //   plugins: {
    //     elasticsearch: __LEGACY.plugins.elasticsearch,
    //   },
    // };

    // license.registerLicenseChecker();

    const router = http.createRouter();

    const routeDependencies: RouteDependencies = {
      router,
      plugins: {
        elasticsearch,
        license: {
          getStatus: () => this.licenseStatus,
        },
      },
    };

    registerApiRoutes(routeDependencies);

    // TODO: Remove if condition when migration is done and moved to "plugins" folder
    if (licensing.license$) {
      licensing.license$.subscribe(license => {
        const { state, message } = license.check(PLUGIN.id, PLUGIN.minimumLicenseType);
        const hasRequiredLicense = state === LICENSE_CHECK_STATE.Valid;
        if (hasRequiredLicense) {
          this.licenseStatus = { isValid: true };
        } else {
          this.licenseStatus = {
            isValid: false,
            message:
              message ||
              // Ensure that there is a message when license check fails
              i18n.translate('xpack.idxMgmt.licenseCheckErrorMessage', {
                defaultMessage: 'License check failed',
              }),
          };
          if (message) {
            this.log.info(message);
          }
        }
      });
    }

    return {
      addIndexManagementDataEnricher,
    };
  }

  start() {}
  stop() {}
}
