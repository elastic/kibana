/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlPluginStart } from '@kbn/ml-plugin-contracts';
import { fromPromise } from 'xstate5';

export interface MlFeatureFlags {
  isPatternsEnabled: boolean;
}

export type MlCapabilities =
  | {
      status: 'available';
    }
  | {
      status: 'unavailable';
      reason: 'disabled' | 'insufficientLicense';
    };

export type GetMlApiDependency = NonNullable<MlPluginStart['getMlApi']> | undefined;

export const loadMlCapabilitiesActor = ({ getMlApi }: { getMlApi: GetMlApiDependency }) =>
  fromPromise<MlCapabilities, { featureFlags: MlFeatureFlags }>(
    async ({ input: { featureFlags } }) => {
      if (!getMlApi || !featureFlags.isPatternsEnabled) {
        return {
          status: 'unavailable' as const,
          reason: 'disabled',
        };
      }

      const mlApi = await getMlApi();
      const mlCapabilities = await mlApi?.checkMlCapabilities();

      if (!mlCapabilities.isPlatinumOrTrialLicense) {
        return {
          status: 'unavailable' as const,
          reason: 'insufficientLicense',
        };
      } else if (!mlCapabilities.mlFeatureEnabledInSpace) {
        return {
          status: 'unavailable' as const,
          reason: 'disabled',
        };
      }

      return {
        status: 'available' as const,
      };
    }
  );
