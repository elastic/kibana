/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * READ ME:
 *
 * ILM policies express data age thresholds as minimum age from an absolute point of reference.
 * The absolute point of reference could be when data was created, but it could also be when
 * rollover has occurred. This is useful for configuring a policy, but when trying to understand
 * how long data will be in a specific phase, when thinking of data tiers, it is not as useful.
 *
 * This code converts the absolute timings to _relative_ timings of the form: 30 days in hot phase,
 * 40 days in warm phase then forever in cold phase.
 *
 * All functions exported from this file can be viewed as utilities for working with form data and
 * other defined interfaces to calculate the relative amount of time data will spend in a phase.
 */

import moment from 'moment';

import type { Phase, PhaseWithTiming } from '../../../../../common/types';

import { splitSizeAndUnits } from '../../../lib/policies';
import type { FormInternal } from '../types';

/* -===- Private functions and types -===- */

const phaseOrder: Phase[] = ['hot', 'warm', 'cold', 'frozen', 'delete'];

const getMinAge = (phase: PhaseWithTiming, formData: FormInternal) => ({
  min_age: formData.phases?.[phase]?.min_age
    ? formData.phases[phase]!.min_age! + formData._meta[phase].minAgeUnit
    : '0ms',
});

/**
 * See https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#date-math
 * for all date math values. ILM policies also support "micros" and "nanos".
 */
export const getPhaseMinAgeInMilliseconds = (size: string, units: string): number => {
  let milliseconds: number;

  if (units === 'micros') {
    milliseconds = parseInt(size, 10) / 1e3;
  } else if (units === 'nanos') {
    milliseconds = parseInt(size, 10) / 1e6;
  } else {
    milliseconds = moment.duration(size, units as any).asMilliseconds();
  }
  return milliseconds;
};

/* -===- Public functions and types -===- */

export interface AbsoluteTimings {
  hot: {
    min_age: undefined;
  };
  warm?: {
    min_age: string;
  };
  cold?: {
    min_age: string;
  };
  frozen?: {
    min_age: string;
  };
  delete?: {
    min_age: string;
  };
}

export interface PhaseAgeInMilliseconds {
  total: number;
  phases: {
    hot: number;
    warm?: number;
    cold?: number;
    frozen?: number;
  };
}

export const formDataToAbsoluteTimings = (formData: FormInternal): AbsoluteTimings => {
  const { _meta } = formData;
  if (!_meta) {
    return { hot: { min_age: undefined } };
  }
  return {
    hot: { min_age: undefined },
    warm: _meta.warm.enabled ? getMinAge('warm', formData) : undefined,
    cold: _meta.cold.enabled ? getMinAge('cold', formData) : undefined,
    frozen: _meta.frozen?.enabled ? getMinAge('frozen', formData) : undefined,
    delete: _meta.delete.enabled ? getMinAge('delete', formData) : undefined,
  };
};

/**
 * Given a set of phase minimum age absolute timings, like hot phase 0ms and warm phase 3d, work out
 * the number of milliseconds data will reside in phase.
 */
export const calculateRelativeFromAbsoluteMilliseconds = (
  inputs: AbsoluteTimings
): PhaseAgeInMilliseconds => {
  return phaseOrder.reduce<PhaseAgeInMilliseconds>(
    (acc, phaseName, idx) => {
      // Delete does not have an age associated with it
      if (phaseName === 'delete') {
        return acc;
      }
      const phase = inputs[phaseName];
      if (!phase) {
        return acc;
      }
      const nextPhase = phaseOrder
        .slice(idx + 1)
        .find((nextPhaseName) => Boolean(inputs[nextPhaseName])); // find the next existing phase

      let nextPhaseMinAge = Infinity;

      // If we have a next phase, calculate the timing between this phase and the next
      if (nextPhase && inputs[nextPhase]?.min_age) {
        const { units, size } = splitSizeAndUnits(
          (inputs[nextPhase] as { min_age: string }).min_age
        );
        nextPhaseMinAge = getPhaseMinAgeInMilliseconds(size, units);
      }

      return {
        // data will be the age of the phase with the highest min age requirement
        total: Math.max(acc.total, nextPhaseMinAge),
        phases: {
          ...acc.phases,
          [phaseName]: Math.max(nextPhaseMinAge - acc.total, 0), // get the max age for the current phase, take 0 if negative number
        },
      };
    },
    {
      total: 0,
      phases: {
        hot: 0,
        warm: inputs.warm ? 0 : undefined,
        cold: inputs.cold ? 0 : undefined,
        frozen: inputs.frozen ? 0 : undefined,
      },
    }
  );
};

export type RelativePhaseTimingInMs = ReturnType<typeof calculateRelativeFromAbsoluteMilliseconds>;
