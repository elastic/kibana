/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { Observable, Subscription } from 'rxjs';
import { ILicense, LICENSE_CHECK_STATE } from '../../../../../plugins/licensing/common/types';
import { assertNever } from '../../../../../../src/core/utils';
import { PLUGIN } from '../constants/plugin';

export interface ActionsLicenseInformation {
  showAppLink: boolean;
  enableAppLink: boolean;
  message: string;
}

export class LicenseState {
  private licenseInformation: ActionsLicenseInformation = this.checkLicense(undefined);
  private subscription: Subscription;

  constructor(license$: Observable<ILicense>) {
    this.subscription = license$.subscribe(this.updateInformation.bind(this));
  }

  private updateInformation(license: ILicense | undefined) {
    this.licenseInformation = this.checkLicense(license);
  }

  public clean() {
    this.subscription.unsubscribe();
  }

  public getLicenseInformation() {
    return this.licenseInformation;
  }

  public checkLicense(license: ILicense | undefined): ActionsLicenseInformation {
    if (!license?.isAvailable) {
      return {
        showAppLink: true,
        enableAppLink: false,
        message: i18n.translate(
          'xpack.actions.serverSideErrors.unavailableLicenseInformationErrorMessage',
          {
            defaultMessage:
              'Actions is unavailable - license information is not available at this time.',
          }
        ),
      };
    }

    const check = license.check(PLUGIN.ID, PLUGIN.MINIMUM_LICENSE_REQUIRED);

    switch (check.state) {
      case LICENSE_CHECK_STATE.Expired:
        return {
          showAppLink: true,
          enableAppLink: false,
          message: check.message || '',
        };
      case LICENSE_CHECK_STATE.Invalid:
      case LICENSE_CHECK_STATE.Unavailable:
        return {
          showAppLink: false,
          enableAppLink: false,
          message: check.message || '',
        };
      case LICENSE_CHECK_STATE.Valid:
        return {
          showAppLink: true,
          enableAppLink: true,
          message: '',
        };
      default:
        return assertNever(check.state);
    }
  }
}

export function verifyApiAccessFactory(licenseState: LicenseState) {
  function verifyApiAccess() {
    const licenseCheckResults = licenseState.getLicenseInformation();

    if (licenseCheckResults.showAppLink && licenseCheckResults.enableAppLink) {
      return null;
    }

    throw Boom.forbidden(licenseCheckResults.message);
  }
  return verifyApiAccess;
}
