/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDate } from 'lodash';
import type { HttpStart } from '@kbn/core/public';
import { LicenseType } from '../../common/types';

/** @public */
export interface FeatureUsageServiceSetup {
  /**
   * Register a feature to be able to notify of it's usages using the {@link FeatureUsageServiceStart | service start contract}.
   */
  register(featureName: string, licenseType: LicenseType): void;
}

/** @public */
export interface FeatureUsageServiceStart {
  /**
   * Notify of a registered feature usage at given time.
   *
   * @param featureName - the name of the feature to notify usage of
   * @param usedAt - Either a `Date` or an unix timestamp with ms. If not specified, it will be set to the current time.
   */
  notifyUsage(featureName: string, usedAt?: Date | number): Promise<void>;
}

interface StartDeps {
  http: HttpStart;
}

/**
 * @internal
 */
export class FeatureUsageService {
  private readonly registrations: Array<{ featureName: string; licenseType: LicenseType }> = [];

  public setup(): FeatureUsageServiceSetup {
    return {
      register: async (featureName, licenseType) => {
        this.registrations.push({ featureName, licenseType });
      },
    };
  }

  public start({ http }: StartDeps): FeatureUsageServiceStart {
    // Skip registration if on logged-out page
    // NOTE: this only works because the login page does a full-page refresh after logging in
    // If this is ever changed, this code will need to buffer registrations and call them after the user logs in.
    const registrationPromise =
      http.anonymousPaths.isAnonymous(window.location.pathname) || this.registrations.length === 0
        ? Promise.resolve()
        : http.post('/internal/licensing/feature_usage/register', {
            body: JSON.stringify(this.registrations),
          });

    return {
      notifyUsage: async (featureName, usedAt = Date.now()) => {
        // Skip notification if on logged-out page
        if (http.anonymousPaths.isAnonymous(window.location.pathname)) return;
        // Wait for registrations to complete
        await registrationPromise;

        const lastUsed = isDate(usedAt) ? usedAt.getTime() : usedAt;
        await http.post('/internal/licensing/feature_usage/notify', {
          body: JSON.stringify({
            featureName,
            lastUsed,
          }),
        });
      },
    };
  }
}
