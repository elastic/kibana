/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { Logger } from 'src/core/server';

import { LicensingPluginSetup } from '../../../../../../plugins/licensing/server';
import { LicenseType } from '../../../../../../plugins/licensing/common/types';
import { LICENSE_CHECK_STATE } from '../../../../../../plugins/licensing/common/types';

export interface LicenseStatus {
  isValid: boolean;
  message?: string;
}

export class License {
  private licenseStatus: LicenseStatus;
  private log: Logger;

  constructor(logger: Logger) {
    this.log = logger.get();
    this.licenseStatus = { isValid: false };
  }

  setup(
    { pluginId, minimumLicenseType }: { pluginId: string; minimumLicenseType: LicenseType },
    { licensing }: { licensing: LicensingPluginSetup }
  ) {
    licensing.license$.subscribe(license => {
      const { state, message } = license.check(pluginId, minimumLicenseType);
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

  getStatus() {
    return this.licenseStatus;
  }
}
