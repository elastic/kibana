/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlPluginStart } from '@kbn/ml-plugin/public';
import { fromPromise } from 'xstate5';

export type MlCapabilities =
  | {
      status: 'available';
    }
  | {
      status: 'unavailable';
      reason: 'disabled' | 'insufficientLicense';
    };

export const loadMlCapabilitiesActor = ({ mlApi }: { mlApi: MlPluginStart['mlApi'] }) =>
  fromPromise<MlCapabilities>(async () => {
    if (!mlApi) {
      return {
        status: 'unavailable' as const,
        reason: 'disabled',
      };
    }

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
  });
