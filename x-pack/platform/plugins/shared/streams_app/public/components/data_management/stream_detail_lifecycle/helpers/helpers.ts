/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyDeletePhase, IlmPolicyPhase, IlmPolicyPhases } from '@kbn/streams-schema';
import { last } from 'lodash';

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

const GROW_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const DEFAULT_GROW: GrowValue = 2;
type GrowValue = (typeof GROW_VALUES)[number];

function toGrowValue(value: number): GrowValue {
  const clamped = Math.min(10, Math.max(2, Math.round(value)));
  return GROW_VALUES[clamped - 2];
}

export const getILMRatios = (
  value:
    | {
        phases: IlmPolicyPhases;
      }
    | undefined
) => {
  if (!value) return undefined;

  const orderedPhases = orderIlmPhases(value.phases);

  if (orderedPhases.length === 0) return undefined;

  const totalDuration = parseDurationInSeconds(last(orderedPhases)!.min_age);

  return orderedPhases.map((phase, index, phases) => {
    const nextPhase = phases[index + 1];
    if (!nextPhase) {
      return { ...phase, grow: phase.name === 'delete' ? false : DEFAULT_GROW };
    }

    const phaseDuration =
      parseDurationInSeconds(nextPhase!.min_age) - parseDurationInSeconds(phase!.min_age);
    return {
      ...phase,
      grow: totalDuration ? toGrowValue((phaseDuration / totalDuration) * 10) : DEFAULT_GROW,
    };
  });
};
