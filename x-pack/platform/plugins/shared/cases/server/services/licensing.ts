/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import type { ILicense, LicenseType, LicensingPluginStart } from '@kbn/licensing-plugin/server';

export class LicensingService {
  private readonly license$: Observable<ILicense>;
  private readonly _notifyUsage: LicensingPluginStart['featureUsage']['notifyUsage'];

  constructor(
    license$: Observable<ILicense>,
    notifyUsage: LicensingPluginStart['featureUsage']['notifyUsage']
  ) {
    this.license$ = license$;
    this._notifyUsage = notifyUsage;
  }

  public notifyUsage(featureName: string) {
    this._notifyUsage(featureName);
  }

  public async getLicenseInformation(): Promise<ILicense> {
    return firstValueFrom(this.license$);
  }

  public async isAtLeast(level: LicenseType): Promise<boolean> {
    const license = await this.getLicenseInformation();
    return !!license && license.isAvailable && license.isActive && license.hasAtLeast(level);
  }

  public async isAtLeastPlatinum() {
    return this.isAtLeast('platinum');
  }

  public async isAtLeastGold() {
    return this.isAtLeast('gold');
  }

  public async isAtLeastEnterprise() {
    return this.isAtLeast('enterprise');
  }
}
