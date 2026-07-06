/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PhaseName } from '@kbn/streams-schema';

/**
 * Describes a single constraint (lower or upper bound) on a timing/interval field.
 * `name` is a ready-to-render noun phrase for the constraining neighbor
 * (e.g. "the frozen phase", "the previous step", "data retention") and `value` is a
 * formatted duration (e.g. "40d").
 */
export interface HelpTextBound {
  name: string;
  value: string;
}

/**
 * Noun phrase for an ILM phase, e.g. "the frozen phase". Used to reference the
 * neighboring phase that constrains a timing/interval field.
 */
export const getPhaseBoundName = (phase: PhaseName): string =>
  i18n.translate('xpack.streams.dataPhases.boundHelpText.phaseName', {
    defaultMessage: 'the {phase} phase',
    values: { phase },
  });

/** Noun phrase for the previous downsample step. */
export const getPreviousStepBoundName = (): string =>
  i18n.translate('xpack.streams.dataPhases.boundHelpText.previousStep', {
    defaultMessage: 'the previous step',
  });

/** Noun phrase for a specific downsample step's interval, e.g. "the step 1 interval". */
export const getStepIntervalBoundName = (stepNumber: number): string =>
  i18n.translate('xpack.streams.dataPhases.boundHelpText.stepInterval', {
    defaultMessage: 'the step {stepNumber} interval',
    values: { stepNumber },
  });

/**
 * Build the help text for a timing field (min-age / "after"), naming the
 * neighboring constraint(s) and their value(s). Returns `undefined` when the field
 * is unconstrained by any neighbor.
 */
export const getTimingBoundHelpText = ({
  lower,
  upper,
}: {
  lower?: HelpTextBound;
  upper?: HelpTextBound;
}): string | undefined => {
  if (lower && upper) {
    return i18n.translate('xpack.streams.dataPhases.boundHelpText.timingRange', {
      defaultMessage:
        'Must occur after {lowerName} ({lowerValue}) and before {upperName} ({upperValue}).',
      values: {
        lowerName: lower.name,
        lowerValue: lower.value,
        upperName: upper.name,
        upperValue: upper.value,
      },
    });
  }
  if (lower) {
    return i18n.translate('xpack.streams.dataPhases.boundHelpText.timingLowerBound', {
      defaultMessage: 'Must occur after {name} ({value}).',
      values: { name: lower.name, value: lower.value },
    });
  }
  if (upper) {
    return i18n.translate('xpack.streams.dataPhases.boundHelpText.timingUpperBound', {
      defaultMessage: 'Must occur before {name} ({value}).',
      values: { name: upper.name, value: upper.value },
    });
  }
  return undefined;
};

/**
 * Build the help text for an interval field (downsample interval). `multipleOf` is the interval
 * the value must be a multiple of (the previous step/phase interval); `upper` is the constraint the
 * value must stay under (the frozen or delete phase). Returns `undefined` when the field is
 * unconstrained.
 */
export const getIntervalBoundHelpText = ({
  multipleOf,
  upper,
}: {
  multipleOf?: HelpTextBound;
  upper?: HelpTextBound;
}): string | undefined => {
  if (multipleOf && upper) {
    return i18n.translate('xpack.streams.dataPhases.boundHelpText.intervalMultipleAndUpper', {
      defaultMessage:
        'Must be a multiple of {multipleName} ({multipleValue}) and smaller than {upperName} ({upperValue}).',
      values: {
        multipleName: multipleOf.name,
        multipleValue: multipleOf.value,
        upperName: upper.name,
        upperValue: upper.value,
      },
    });
  }
  if (multipleOf) {
    return i18n.translate('xpack.streams.dataPhases.boundHelpText.intervalMultiple', {
      defaultMessage: 'Must be a multiple of {name} ({value}).',
      values: { name: multipleOf.name, value: multipleOf.value },
    });
  }
  if (upper) {
    return i18n.translate('xpack.streams.dataPhases.boundHelpText.intervalUpperBound', {
      defaultMessage: 'Must be smaller than {name} ({value}).',
      values: { name: upper.name, value: upper.value },
    });
  }
  return undefined;
};
