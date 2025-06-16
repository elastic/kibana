/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, pick } from 'lodash';
import { IlmPolicyPhases } from '@kbn/streams-schema';
import {
  IlmExplainLifecycleLifecycleExplain,
  IlmPolicy,
  IlmPhase,
  IndicesStatsIndicesStats,
} from '@elastic/elasticsearch/lib/api/types';

export function ilmPhases({
  policy,
  indicesIlmDetails,
  indicesStats,
}: {
  policy: IlmPolicy;
  indicesIlmDetails: Record<string, IlmExplainLifecycleLifecycleExplain>;
  indicesStats: Record<string, IndicesStatsIndicesStats>;
}) {
  const phaseWithName = (name: keyof IlmPolicyPhases, phase?: IlmPhase) => {
    if (!phase) return undefined;
    return { ...pick(phase, ['min_age'], ['actions']), name };
  };

  const ilmDetails = Object.values(indicesIlmDetails);
  const phasesWithName = compact([
    phaseWithName('hot' as const, policy.phases.hot),
    phaseWithName('warm' as const, policy.phases.warm),
    phaseWithName('cold' as const, policy.phases.cold),
    phaseWithName('frozen' as const, policy.phases.frozen),
    phaseWithName('delete' as const, policy.phases.delete),
  ]);

  return phasesWithName.reduce((phases, phase) => {
    if (phase.name === 'delete') {
      phases[phase.name] = { name: phase.name, min_age: phase.min_age!.toString() };
      return phases;
    }

    const sizeInBytes = ilmDetails
      .filter((detail) => detail.managed && detail.phase === phase.name)
      .map((detail) => indicesStats[detail.index!])
      .reduce((size, stats) => size + (stats?.total?.store?.size_in_bytes ?? 0), 0);

    const policyPhase = {
      name: phase.name,
      size_in_bytes: sizeInBytes,
      min_age: phase.min_age?.toString(),
    };
    if (phase.name === 'hot') {
      const rollover = phase.actions?.rollover;
      const maxAge = !rollover?.max_age || rollover?.max_age === -1 ? undefined : rollover.max_age;
      phases[phase.name] = {
        ...policyPhase,
        name: 'hot',
        rollover: {
          max_age: maxAge,
          max_size: phase.actions?.rollover?.max_size,
          max_primary_shard_size: phase.actions?.rollover?.max_primary_shard_size,
          max_docs: phase.actions?.rollover?.max_docs,
          max_primary_shard_docs: phase.actions?.rollover?.max_primary_shard_docs,
        },
      };
    } else {
      phases[phase.name] = policyPhase;
    }

    return phases;
  }, {} as IlmPolicyPhases);
}
