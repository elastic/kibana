/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IlmPhase } from './phases';
import { PHASE_NAMES_LOWERCASE } from './phases';

/** Token emitted by validators when a boundary constraint is violated; field components detect it and show their computed help text as the error. */
export const BOUNDARY_VALIDATION_ERROR = '__kbn_boundary_error__';

/** The neighbor that constrains a timing/interval field. */
export type BoundNeighbor =
  | { type: 'phase'; phase: IlmPhase }
  | { type: 'previousStep' }
  | { type: 'stepInterval'; stepNumber: number };

/** A single constraint on a field: the neighbor and its formatted duration (e.g. "40d"). */
export interface HelpTextBound {
  neighbor: BoundNeighbor;
  value: string;
}

/**
 * Build the help text for a timing field (min-age / "after"). Returns `undefined` when the field is
 * unconstrained. The lower bound may be a phase or the previous downsample step; the upper bound is
 * always a phase (frozen/delete).
 */
export const getTimingBoundHelpText = ({
  lower,
  upper,
}: {
  lower?: HelpTextBound;
  upper?: HelpTextBound;
}): string | undefined => {
  if (lower?.neighbor.type === 'phase' && upper?.neighbor.type === 'phase') {
    return i18n.translate('xpack.dataLifecyclePhases.boundHelpText.timingAfterPhaseBeforePhase', {
      defaultMessage:
        'Must occur after the {lowerPhase} phase ({lowerValue}) and before the {upperPhase} phase ({upperValue}).',
      values: {
        lowerPhase: PHASE_NAMES_LOWERCASE[lower.neighbor.phase],
        lowerValue: lower.value,
        upperPhase: PHASE_NAMES_LOWERCASE[upper.neighbor.phase],
        upperValue: upper.value,
      },
    });
  }
  if (lower?.neighbor.type === 'previousStep' && upper?.neighbor.type === 'phase') {
    return i18n.translate(
      'xpack.dataLifecyclePhases.boundHelpText.timingAfterPreviousStepBeforePhase',
      {
        defaultMessage:
          'Must occur after the previous step ({lowerValue}) and before the {upperPhase} phase ({upperValue}).',
        values: {
          lowerValue: lower.value,
          upperPhase: PHASE_NAMES_LOWERCASE[upper.neighbor.phase],
          upperValue: upper.value,
        },
      }
    );
  }
  if (lower?.neighbor.type === 'phase') {
    return i18n.translate('xpack.dataLifecyclePhases.boundHelpText.timingAfterPhase', {
      defaultMessage: 'Must occur after the {phase} phase ({value}).',
      values: { phase: PHASE_NAMES_LOWERCASE[lower.neighbor.phase], value: lower.value },
    });
  }
  if (lower?.neighbor.type === 'previousStep') {
    return i18n.translate('xpack.dataLifecyclePhases.boundHelpText.timingAfterPreviousStep', {
      defaultMessage: 'Must occur after the previous step ({value}).',
      values: { value: lower.value },
    });
  }
  if (upper?.neighbor.type === 'phase') {
    return i18n.translate('xpack.dataLifecyclePhases.boundHelpText.timingBeforePhase', {
      defaultMessage: 'Must occur before the {phase} phase ({value}).',
      values: { phase: PHASE_NAMES_LOWERCASE[upper.neighbor.phase], value: upper.value },
    });
  }
  return undefined;
};

/**
 * Build the help text for an interval field (downsample interval). `multipleOf` is the interval the
 * value must be a multiple of (a previous phase's interval, or a previous step's interval); `upper`
 * is the phase the value must stay under. Returns `undefined` when the field is unconstrained.
 */
export const getIntervalBoundHelpText = ({
  multipleOf,
  upper,
}: {
  multipleOf?: HelpTextBound;
  upper?: HelpTextBound;
}): string | undefined => {
  if (multipleOf?.neighbor.type === 'phase' && upper?.neighbor.type === 'phase') {
    return i18n.translate(
      'xpack.dataLifecyclePhases.boundHelpText.intervalMultiplePhaseSmallerThanPhase',
      {
        defaultMessage:
          'Must be a multiple of the {multiplePhase} phase ({multipleValue}) and smaller than the {upperPhase} phase ({upperValue}).',
        values: {
          multiplePhase: PHASE_NAMES_LOWERCASE[multipleOf.neighbor.phase],
          multipleValue: multipleOf.value,
          upperPhase: PHASE_NAMES_LOWERCASE[upper.neighbor.phase],
          upperValue: upper.value,
        },
      }
    );
  }
  if (multipleOf?.neighbor.type === 'stepInterval' && upper?.neighbor.type === 'phase') {
    return i18n.translate(
      'xpack.dataLifecyclePhases.boundHelpText.intervalMultipleStepSmallerThanPhase',
      {
        defaultMessage:
          'Must be a multiple of the step {stepNumber} interval ({multipleValue}) and smaller than the {upperPhase} phase ({upperValue}).',
        values: {
          stepNumber: multipleOf.neighbor.stepNumber,
          multipleValue: multipleOf.value,
          upperPhase: PHASE_NAMES_LOWERCASE[upper.neighbor.phase],
          upperValue: upper.value,
        },
      }
    );
  }
  if (multipleOf?.neighbor.type === 'phase') {
    return i18n.translate('xpack.dataLifecyclePhases.boundHelpText.intervalMultiplePhase', {
      defaultMessage: 'Must be a multiple of the {phase} phase ({value}).',
      values: {
        phase: PHASE_NAMES_LOWERCASE[multipleOf.neighbor.phase],
        value: multipleOf.value,
      },
    });
  }
  if (multipleOf?.neighbor.type === 'stepInterval') {
    return i18n.translate('xpack.dataLifecyclePhases.boundHelpText.intervalMultipleStep', {
      defaultMessage: 'Must be a multiple of the step {stepNumber} interval ({value}).',
      values: { stepNumber: multipleOf.neighbor.stepNumber, value: multipleOf.value },
    });
  }
  if (upper?.neighbor.type === 'phase') {
    return i18n.translate('xpack.dataLifecyclePhases.boundHelpText.intervalSmallerThanPhase', {
      defaultMessage: 'Must be smaller than the {phase} phase ({value}).',
      values: { phase: PHASE_NAMES_LOWERCASE[upper.neighbor.phase], value: upper.value },
    });
  }
  return undefined;
};
