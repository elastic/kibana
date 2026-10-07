/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestStreamEffectiveLifecycle,
  IngestStreamLifecycle,
  IngestStreamLifecycleDSL,
} from '@kbn/streams-schema';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import type { IlmPolicyForFlyout } from '@kbn/data-lifecycle-phases';
import { getIlmPolicySummaryStats } from '@kbn/data-lifecycle-phases';

export const getImportedLifecycle = ({
  effectiveLifecycle,
  targetIsTimeSeries,
}: {
  effectiveLifecycle: IngestStreamEffectiveLifecycle;
  targetIsTimeSeries: boolean;
}): IngestStreamLifecycle | null => {
  if (isIlmLifecycle(effectiveLifecycle)) {
    return { ilm: { policy: effectiveLifecycle.ilm.policy } };
  }

  if (isDslLifecycle(effectiveLifecycle)) {
    const {
      data_retention: dataRetention,
      frozen_after: frozenAfter,
      downsample,
    } = effectiveLifecycle.dsl;

    const dsl: IngestStreamLifecycleDSL['dsl'] = {};
    if (dataRetention) {
      dsl.data_retention = dataRetention;
    }
    if (frozenAfter) {
      dsl.frozen_after = frozenAfter;
    }
    if (targetIsTimeSeries && downsample && downsample.length > 0) {
      dsl.downsample = downsample;
    }

    return { dsl };
  }

  return null;
};

export const sourceHasDownsampling = ({
  effectiveLifecycle,
  ilmPoliciesByName,
}: {
  effectiveLifecycle: IngestStreamEffectiveLifecycle;
  ilmPoliciesByName: Map<string, IlmPolicyForFlyout>;
}): boolean => {
  if (isDslLifecycle(effectiveLifecycle)) {
    return (effectiveLifecycle.dsl.downsample?.length ?? 0) > 0;
  }

  if (isIlmLifecycle(effectiveLifecycle)) {
    const policy = ilmPoliciesByName.get(effectiveLifecycle.ilm.policy);
    if (!policy) {
      return false;
    }
    return getIlmPolicySummaryStats(policy.phases).downsampleStepCount > 0;
  }

  return false;
};
