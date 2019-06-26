/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PLUGIN } from '../../../../common/constants';
import { UMAuthAdapter, UMAuthContainer, UMXPackLicenseStatus } from './adapter_types';

// look at index-management for guidance, subscribe to licensecheckerresultsgenerator
// then check the license status
export class UMXPackAuthAdapter implements UMAuthAdapter {
  private xpackLicenseStatus: {
    isActive: boolean | undefined | null;
    licenseType: string | undefined | null;
  };

  constructor(private readonly xpack: UMAuthContainer) {
    this.xpack = xpack;
    this.xpackLicenseStatus = {
      isActive: null,
      licenseType: null,
    };
    this.xpack.status.once('green', this.registerLicenseCheck);
  }

  public getLicenseType = (): string | null => this.xpackLicenseStatus.licenseType || null;

  public licenseIsActive = (): boolean => this.xpackLicenseStatus.isActive || false;

  private registerLicenseCheck = (): void =>
    this.xpack.info.feature(PLUGIN.ID).registerLicenseCheckResultsGenerator(this.updateLicenseInfo);

  private updateLicenseInfo = (xpackLicenseStatus: UMXPackLicenseStatus): void => {
    this.xpackLicenseStatus = {
      isActive: xpackLicenseStatus.license.isActive(),
      licenseType: xpackLicenseStatus.license.getType(),
    };
  };
}
