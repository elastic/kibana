/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { assertNever } from '@kbn/std';
import type { Observable, Subscription } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
import { PLUGIN } from '../../common/constants';

export type ILicenseState = PublicMethodsOf<LicenseState>;

export interface MaintenanceWindowsLicenseInfo {
  showAppLink: boolean;
  enableAppLink: boolean;
  message: string;
}

export class LicenseState {
  private licenseInformation: MaintenanceWindowsLicenseInfo = this.checkLicense(undefined);
  private subscription: Subscription;
  private license?: ILicense;

  constructor(license$: Observable<ILicense>) {
    this.subscription = license$.subscribe(this.updateInformation.bind(this));
  }

  private updateInformation(license: ILicense | undefined) {
    this.license = license;
    this.licenseInformation = this.checkLicense(license);
  }

  public clean() {
    this.subscription.unsubscribe();
  }

  public getLicenseInformation() {
    return this.licenseInformation;
  }

  public getIsSecurityEnabled(): boolean | null {
    if (!this.license || !this.license?.isAvailable) {
      return null;
    }

    const { isEnabled } = this.license.getFeature('security');
    return isEnabled;
  }

  public checkLicense(license: ILicense | undefined): MaintenanceWindowsLicenseInfo {
    if (!license || !license.isAvailable) {
      return {
        showAppLink: true,
        enableAppLink: false,
        message: i18n.translate(
          'xpack.maintenanceWindows.serverSideErrors.unavailableLicenseInformationErrorMessage',
          {
            defaultMessage:
              'Maintenance Windows is unavailable - license information is not available at this time.',
          }
        ),
      };
    }

    const check = license.check(PLUGIN.ID, PLUGIN.MINIMUM_LICENSE_REQUIRED);

    switch (check.state) {
      case 'expired':
        return {
          showAppLink: true,
          enableAppLink: false,
          message: check.message || '',
        };
      case 'invalid':
      case 'unavailable':
        return {
          showAppLink: false,
          enableAppLink: false,
          message: check.message || '',
        };
      case 'valid':
        return {
          showAppLink: true,
          enableAppLink: true,
          message: '',
        };
      default:
        return assertNever(check.state);
    }
  }

  public ensureLicenseForMaintenanceWindow() {
    if (!this.license || !this.license?.isAvailable) {
      throw Boom.forbidden(
        i18n.translate(
          'xpack.maintenanceWindows.serverSideErrors.maintenanceWindow.unavailableLicenseErrorMessage',
          {
            defaultMessage:
              'Maintenance window is disabled because license information is not available at this time.',
          }
        )
      );
    }
    if (!this.license.hasAtLeast('platinum')) {
      throw Boom.forbidden(
        i18n.translate(
          'xpack.maintenanceWindows.serverSideErrors.maintenanceWindow.invalidLicenseErrorMessage',
          {
            defaultMessage:
              'Maintenance window is disabled because it requires a platinum license. Go to License Management to view upgrade options.',
          }
        )
      );
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
