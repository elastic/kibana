/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-types';
import type { Observable, Subscription } from 'rxjs';

export class LicenseSubscriber {
  private subscription: Subscription;

  private licenseState?: ILicense;

  constructor(license: Observable<ILicense>) {
    this.getIsSecurityEnabled = this.getIsSecurityEnabled.bind(this);
    this.getIsSecurityDisabled = this.getIsSecurityDisabled.bind(this);
    this.updateState = this.updateState.bind(this);

    this.subscription = license.subscribe(this.updateState);
  }

  private updateState(license: ILicense | undefined) {
    this.licenseState = license;
  }

  public getIsSecurityEnabled() {
    if (!this.licenseState || !this.licenseState.isAvailable) {
      return false;
    }

    return this.licenseState.getFeature('security').isEnabled;
  }

  /**
   * Returns true only when an available license explicitly reports the security feature as disabled; an unknown license or missing feature is not treated as disabled.
   */
  public getIsSecurityDisabled() {
    if (!this.licenseState || !this.licenseState.isAvailable) {
      return false;
    }

    const { isAvailable, isEnabled } = this.licenseState.getFeature('security');
    return isAvailable && !isEnabled;
  }

  public cleanup() {
    this.subscription.unsubscribe();
  }
}
