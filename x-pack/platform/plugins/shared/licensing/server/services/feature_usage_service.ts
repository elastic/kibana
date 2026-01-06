/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDate } from 'lodash';
import type { LicenseType } from '@kbn/licensing-types';

/** @public */
export interface FeatureUsageServiceSetup {
  /**
   * Register a feature to be able to notify of it's usages using the {@link FeatureUsageServiceStart | service start contract}.
   */
  register(featureId: string, licenseType: LicenseType): void;
}

export interface LastFeatureUsage {
  id: string;
  lastUsed: Date | null;
  licenseType: LicenseType;
}

/** @public */
export interface FeatureUsageServiceStart {
  /**
   * Notify of a registered feature usage at given time.
   *
   * @param featureId - the identifer of the feature to notify usage of
   * @param usedAt - Either a `Date` or an unix timestamp with ms. If not specified, it will be set to the current time.
   */
  notifyUsage(featureId: string, usedAt?: Date | number): void;
  /**
   * Return a map containing last usage timestamp for all features.
   * Features that were not used yet do not appear in the map.
   */
  getLastUsages(): LastFeatureUsage[];
}

export class FeatureUsageService {
  private readonly lastUsages = new Map<string, LastFeatureUsage>();

  public setup(): FeatureUsageServiceSetup {
    return {
      register: (featureId, licenseType) => {
        const registered = this.lastUsages.get(featureId);
        if (registered) {
          if (registered.licenseType !== licenseType) {
            throw new Error(
              `Feature '${featureId}' has already been registered with another license type. (current: ${registered.licenseType}, new: ${licenseType})`
            );
          }
        } else {
          this.lastUsages.set(featureId, {
            id: featureId,
            lastUsed: null,
            licenseType,
          });
        }
      },
    };
  }

  public start(): FeatureUsageServiceStart {
    return {
      notifyUsage: (featureId, usedAt = Date.now()) => {
        const usage = this.lastUsages.get(featureId);
        if (!usage) {
          throw new Error(`Feature '${featureId}' is not registered.`);
        }

        const lastUsed = isDate(usedAt) ? usedAt : new Date(usedAt);
        if (usage.lastUsed == null || lastUsed > usage.lastUsed) {
          usage.lastUsed = lastUsed;
        }
      },
      getLastUsages: () => Array.from(this.lastUsages.values()),
    };
  }
}
