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

import { addIndexManagementDataEnricher } from './index_management_data';
import { ApiRoutes } from './routes';

export interface IndexMgmtSetup {
  addIndexManagementDataEnricher: (enricher: any) => void;
}

export class IndexMgmtServerPlugin implements Plugin<IndexMgmtSetup, void, any, any> {
  private readonly apiRoutes = new ApiRoutes();
  private licenseStatus: LicenseStatus;
  private log: Logger;

  constructor({ logger }: PluginInitializerContext) {
    this.log = logger.get();
    this.licenseStatus = { isValid: false };
  }

  setup({ http }: CoreSetup, { licensing }: Dependencies): IndexMgmtSetup {
    const router = http.createRouter();

    const routeDependencies: RouteDependencies = {
      router,
      plugins: {
        license: {
          getStatus: () => this.licenseStatus,
        },
      },
    };

    this.apiRoutes.setup(routeDependencies);

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

    return {
      addIndexManagementDataEnricher,
    };
  }

  start() {}
  stop() {}
}
