/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IlmPolicyDeletePhase,
  IlmPolicyPhase,
  IlmPolicyPhases,
  IngestStreamLifecycle,
  Streams,
} from '@kbn/streams-schema';
import { first } from 'lodash';

export const parseDuration = (duration: string = '') => {
  const result = /^(\d+)([d|m|s|h])$/.exec(duration);
  if (!result) return undefined;
  return { value: Number(result[1]), unit: result[2] };
};

export function parseDurationInSeconds(duration: string = ''): number {
  const parsed = parseDuration(duration);
  if (!parsed) {
    return 0;
  }

  const { value, unit } = parsed;
  if (unit === 's') {
    return value;
  } else if (unit === 'm') {
    return value * 60;
  } else if (unit === 'h') {
    return value * 60 * 60;
  } else if (unit === 'd') {
    return value * 24 * 60 * 60;
  }

  throw new Error(`Invalid duration unit [${unit}]`);
}

export function orderIlmPhases(phases: IlmPolicyPhases) {
  const isPhase = (
    phase?: IlmPolicyPhase | IlmPolicyDeletePhase
  ): phase is IlmPolicyPhase | IlmPolicyDeletePhase => Boolean(phase);
  return [phases.hot, phases.warm, phases.cold, phases.frozen, phases.delete].filter(isPhase);
}

export const getILMRatios = (
  value:
    | {
        phases: IlmPolicyPhases;
      }
    | undefined
) => {
  if (!value) return undefined;

  const orderedPhases = orderIlmPhases(value.phases).reverse();
  const totalDuration = parseDurationInSeconds(first(orderedPhases)!.min_age);

  return orderedPhases.map((phase, index, phases) => {
    const prevPhase = phases[index - 1];
    if (!prevPhase) {
      return { ...phase, grow: phase.name === 'delete' ? false : 2 };
    }

    const phaseDuration =
      parseDurationInSeconds(prevPhase!.min_age) - parseDurationInSeconds(phase!.min_age);
    return {
      ...phase,
      grow: totalDuration ? Math.max(2, Math.round((phaseDuration / totalDuration) * 10)) : 2,
    };
  });
};

export function buildLifecycleSaveRequestPayload(
  definition: Streams.ingest.all.GetResponse,
  lifecycle: IngestStreamLifecycle
): { ingest: Streams.ingest.all.GetResponse['stream']['ingest'] } {
  return {
    ingest: {
      ...definition.stream.ingest,
      lifecycle,
    },
  };
}
