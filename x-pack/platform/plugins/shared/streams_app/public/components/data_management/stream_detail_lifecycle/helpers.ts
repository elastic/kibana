/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmPolicyDeletePhase, IlmPolicyPhase, IlmPolicyPhases } from '@kbn/streams-schema';

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
