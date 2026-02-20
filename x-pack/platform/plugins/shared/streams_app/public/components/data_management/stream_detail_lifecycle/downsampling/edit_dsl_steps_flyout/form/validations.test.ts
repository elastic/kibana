/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationFuncArg } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import {
  afterGreaterThanPreviousStep,
  fixedIntervalMultipleOfPreviousStep,
  fixedIntervalMustBeAtLeastFiveMinutes,
} from './validations';

type FlatFormData = Record<string, unknown>;

const createArg = ({
  path,
  value,
  formData = {},
}: {
  path: string;
  value: unknown;
  formData?: FlatFormData;
}): ValidationFuncArg<FlatFormData, unknown> =>
  ({
    path,
    value,
    formData,
    errors: [],
    form: {
      getFormData: () => ({}),
      getFields: () => ({}),
    },
    customData: {
      provider: async () => undefined,
      value: undefined,
    },
  } as unknown as ValidationFuncArg<FlatFormData, unknown>);

describe('streams DSL steps flyout validations', () => {
  it('returns undefined for non-step paths', () => {
    const result = afterGreaterThanPreviousStep(
      createArg({ path: '_meta.downsampleSteps.afterValue', value: '1' })
    );
    expect(result).toBeUndefined();
  });

  describe('afterGreaterThanPreviousStep', () => {
    const dayMs = 86_400_000;

    it('fails when current after is smaller than previous step', () => {
      const formData: FlatFormData = {
        '_meta.downsampleSteps[0].afterValue': '30',
        '_meta.downsampleSteps[0].afterUnit': 'd',
        '_meta.downsampleSteps[0].afterToMilliSeconds': 30 * dayMs,
        '_meta.downsampleSteps[1].afterValue': '20',
        '_meta.downsampleSteps[1].afterUnit': 'd',
        '_meta.downsampleSteps[1].afterToMilliSeconds': 20 * dayMs,
      };

      const result = afterGreaterThanPreviousStep(
        createArg({
          path: '_meta.downsampleSteps[1].afterValue',
          value: '20',
          formData,
        })
      );

      expect(result).toEqual({
        message: 'Must be greater or equal than the previous step value (30d)',
      });
    });

    it('returns undefined when current after is greater than or equal to previous step', () => {
      const formData: FlatFormData = {
        '_meta.downsampleSteps[0].afterValue': '30',
        '_meta.downsampleSteps[0].afterUnit': 'd',
        '_meta.downsampleSteps[0].afterToMilliSeconds': 30 * dayMs,
        '_meta.downsampleSteps[1].afterValue': '30',
        '_meta.downsampleSteps[1].afterUnit': 'd',
        '_meta.downsampleSteps[1].afterToMilliSeconds': 30 * dayMs,
      };

      const result = afterGreaterThanPreviousStep(
        createArg({
          path: '_meta.downsampleSteps[1].afterValue',
          value: '30',
          formData,
        })
      );

      expect(result).toBeUndefined();
    });
  });

  describe('fixedIntervalMustBeAtLeastFiveMinutes', () => {
    it('fails when fixed_interval is less than 5 minutes', () => {
      const formData: FlatFormData = {
        '_meta.downsampleSteps[0].fixedIntervalUnit': 'm',
      };

      const result = fixedIntervalMustBeAtLeastFiveMinutes(
        createArg({
          path: '_meta.downsampleSteps[0].fixedIntervalValue',
          value: '4',
          formData,
        })
      );

      expect(result).toEqual({ message: 'Must be at least 5 minutes.' });
    });

    it('returns undefined when fixed_interval is at least 5 minutes', () => {
      const formData: FlatFormData = {
        '_meta.downsampleSteps[0].fixedIntervalUnit': 'm',
      };

      const result = fixedIntervalMustBeAtLeastFiveMinutes(
        createArg({
          path: '_meta.downsampleSteps[0].fixedIntervalValue',
          value: '5',
          formData,
        })
      );

      expect(result).toBeUndefined();
    });
  });

  describe('fixedIntervalMultipleOfPreviousStep', () => {
    it('fails when current fixed_interval is not a multiple of the previous step', () => {
      const formData: FlatFormData = {
        '_meta.downsampleSteps[0].fixedIntervalValue': '5',
        '_meta.downsampleSteps[0].fixedIntervalUnit': 'm',
        '_meta.downsampleSteps[1].fixedIntervalValue': '7',
        '_meta.downsampleSteps[1].fixedIntervalUnit': 'm',
      };

      const result = fixedIntervalMultipleOfPreviousStep(
        createArg({
          path: '_meta.downsampleSteps[1].fixedIntervalValue',
          value: '7',
          formData,
        })
      );

      expect(result).toEqual({
        message: 'Must be greater than and a multiple of the previous step value (5m)',
      });
    });

    it('returns undefined when current fixed_interval is greater and a multiple of the previous step', () => {
      const formData: FlatFormData = {
        '_meta.downsampleSteps[0].fixedIntervalValue': '5',
        '_meta.downsampleSteps[0].fixedIntervalUnit': 'm',
        '_meta.downsampleSteps[1].fixedIntervalValue': '10',
        '_meta.downsampleSteps[1].fixedIntervalUnit': 'm',
      };

      const result = fixedIntervalMultipleOfPreviousStep(
        createArg({
          path: '_meta.downsampleSteps[1].fixedIntervalValue',
          value: '10',
          formData,
        })
      );

      expect(result).toBeUndefined();
    });
  });
});
