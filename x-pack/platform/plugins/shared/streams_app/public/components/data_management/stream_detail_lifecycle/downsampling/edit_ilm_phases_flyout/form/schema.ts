/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IlmPhasesFlyoutFormInternal } from './types';
import { DOWNSAMPLE_PHASES, type DownsamplePhase } from './types';
import {
  downsampleIntervalMultipleOfPreviousOne,
  ifExistsNumberGreaterThanZero,
  ifExistsNumberNonNegative,
  minAgeGreaterThanPreviousPhase,
  minAgeMustBeInteger,
  downsampleIntervalMustBeInteger,
  requiredDownsampleIntervalValue,
  requiredMinAgeValue,
  requiredSearchableSnapshotRepository,
} from './validations';

const getDownsampleFieldsToValidateOnChange = (
  phase: DownsamplePhase,
  includeCurrentPhase = true
) => {
  const getIntervalPath = (p: DownsamplePhase) => `_meta.${p}.downsample.fixedIntervalValue`;
  const phasesToValidate = DOWNSAMPLE_PHASES.slice(
    DOWNSAMPLE_PHASES.indexOf(phase) + (includeCurrentPhase ? 0 : 1)
  );
  // When a phase is validated, also validate all downsample intervals in the next phases.
  return phasesToValidate.map(getIntervalPath);
};

/**
 * Minimal schema for the ILM phases flyout.
 *
 * All UI controls write to dedicated form fields under `_meta.*`.
 * Output `IlmPolicyPhases` is built by the serializer from those fields.
 */
export const getIlmPhasesFlyoutFormSchema = (): FormSchema<IlmPhasesFlyoutFormInternal> => ({
  _meta: {
    hot: {
      enabled: { defaultValue: false },
      sizeInBytes: { defaultValue: 0 },
      rollover: { defaultValue: {} },
      readonlyEnabled: { defaultValue: false },
      downsampleEnabled: {
        defaultValue: false,
        fieldsToValidateOnChange: getDownsampleFieldsToValidateOnChange(
          'hot',
          /* don't validate current interval on toggle to avoid pristine error */
          false
        ),
      },
      downsample: {
        fixedIntervalValue: {
          defaultValue: '1',
          fieldsToValidateOnChange: getDownsampleFieldsToValidateOnChange('hot'),
          validations: [
            { validator: requiredDownsampleIntervalValue('hot') },
            { validator: ifExistsNumberGreaterThanZero('hot') },
            { validator: downsampleIntervalMustBeInteger('hot') },
          ],
        },
        fixedIntervalUnit: {
          defaultValue: 'd',
          fieldsToValidateOnChange: getDownsampleFieldsToValidateOnChange('hot'),
        },
      },
    },
    warm: {
      enabled: { defaultValue: false },
      sizeInBytes: { defaultValue: 0 },
      minAgeValue: {
        defaultValue: '',
        fieldsToValidateOnChange: [],
        validations: [
          { validator: requiredMinAgeValue('warm') },
          { validator: ifExistsNumberNonNegative },
          { validator: minAgeMustBeInteger('warm') },
        ],
      },
      minAgeUnit: { defaultValue: 'd' },
      minAgeToMilliSeconds: {
        defaultValue: -1,
        fieldsToValidateOnChange: [
          '_meta.warm.minAgeValue',
          '_meta.cold.minAgeValue',
          '_meta.frozen.minAgeValue',
          '_meta.delete.minAgeValue',
        ],
      },
      readonlyEnabled: { defaultValue: false },
      downsampleEnabled: {
        defaultValue: false,
        fieldsToValidateOnChange: getDownsampleFieldsToValidateOnChange('warm', false),
      },
      downsample: {
        fixedIntervalValue: {
          defaultValue: '1',
          fieldsToValidateOnChange: getDownsampleFieldsToValidateOnChange('warm'),
          validations: [
            { validator: requiredDownsampleIntervalValue('warm') },
            { validator: ifExistsNumberGreaterThanZero('warm') },
            { validator: downsampleIntervalMustBeInteger('warm') },
            { validator: downsampleIntervalMultipleOfPreviousOne('warm') },
          ],
        },
        fixedIntervalUnit: {
          defaultValue: 'd',
          fieldsToValidateOnChange: getDownsampleFieldsToValidateOnChange('warm'),
        },
      },
    },
    cold: {
      enabled: { defaultValue: false },
      sizeInBytes: { defaultValue: 0 },
      minAgeValue: {
        defaultValue: '',
        fieldsToValidateOnChange: [],
        validations: [
          { validator: requiredMinAgeValue('cold') },
          { validator: ifExistsNumberNonNegative },
          { validator: minAgeMustBeInteger('cold') },
          { validator: minAgeGreaterThanPreviousPhase('cold') },
        ],
      },
      minAgeUnit: { defaultValue: 'd' },
      minAgeToMilliSeconds: {
        defaultValue: -1,
        fieldsToValidateOnChange: [
          '_meta.cold.minAgeValue',
          '_meta.frozen.minAgeValue',
          '_meta.delete.minAgeValue',
        ],
      },
      readonlyEnabled: { defaultValue: false },
      downsampleEnabled: {
        defaultValue: false,
        fieldsToValidateOnChange: getDownsampleFieldsToValidateOnChange('cold', false),
      },
      downsample: {
        fixedIntervalValue: {
          defaultValue: '1',
          fieldsToValidateOnChange: getDownsampleFieldsToValidateOnChange('cold'),
          validations: [
            { validator: requiredDownsampleIntervalValue('cold') },
            { validator: ifExistsNumberGreaterThanZero('cold') },
            { validator: downsampleIntervalMustBeInteger('cold') },
            { validator: downsampleIntervalMultipleOfPreviousOne('cold') },
          ],
        },
        fixedIntervalUnit: {
          defaultValue: 'd',
          fieldsToValidateOnChange: getDownsampleFieldsToValidateOnChange('cold'),
        },
      },
      searchableSnapshotEnabled: {
        defaultValue: false,
        fieldsToValidateOnChange: ['_meta.searchableSnapshot.repository'],
      },
    },
    frozen: {
      enabled: {
        defaultValue: false,
        fieldsToValidateOnChange: ['_meta.searchableSnapshot.repository'],
      },
      minAgeValue: {
        defaultValue: '',
        fieldsToValidateOnChange: [],
        validations: [
          { validator: requiredMinAgeValue('frozen') },
          { validator: ifExistsNumberNonNegative },
          { validator: minAgeMustBeInteger('frozen') },
          { validator: minAgeGreaterThanPreviousPhase('frozen') },
        ],
      },
      minAgeUnit: { defaultValue: 'd' },
      minAgeToMilliSeconds: {
        defaultValue: -1,
        fieldsToValidateOnChange: ['_meta.frozen.minAgeValue', '_meta.delete.minAgeValue'],
      },
    },
    delete: {
      enabled: { defaultValue: false },
      minAgeValue: {
        defaultValue: '',
        fieldsToValidateOnChange: [],
        validations: [
          { validator: requiredMinAgeValue('delete') },
          { validator: ifExistsNumberNonNegative },
          { validator: minAgeMustBeInteger('delete') },
          { validator: minAgeGreaterThanPreviousPhase('delete') },
        ],
      },
      minAgeUnit: { defaultValue: 'd' },
      minAgeToMilliSeconds: {
        defaultValue: -1,
        fieldsToValidateOnChange: ['_meta.delete.minAgeValue'],
      },
      deleteSearchableSnapshotEnabled: { defaultValue: true },
    },
    searchableSnapshot: {
      repository: {
        defaultValue: '',
        validations: [{ validator: requiredSearchableSnapshotRepository }],
      },
    },
  },
});
