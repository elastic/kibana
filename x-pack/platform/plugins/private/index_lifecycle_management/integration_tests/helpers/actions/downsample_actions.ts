/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test-jest-helpers';
import { Phase } from '../../../common/types';
import { createFormToggleAction } from '..';

const createSetDownsampleIntervalAction =
  (testBed: TestBed, phase: Phase) => async (value: string, units?: string) => {
    const { find, component } = testBed;

    await act(async () => {
      find(`${phase}-downsampleFixedInterval`).simulate('change', { target: { value } });
    });
    component.update();

    if (units) {
      act(() => {
        find(`${phase}-downsampleFixedIntervalUnits.show-filters-button`).simulate('click');
      });
      component.update();

      act(() => {
        find(`${phase}-downsampleFixedIntervalUnits.filter-option-${units}`).simulate('click');
      });
      component.update();
    }
  };

export const createDownsampleActions = (testBed: TestBed, phase: Phase) => {
  const { exists } = testBed;
  return {
    downsample: {
      exists: () => exists(`${phase}-downsampleSwitch`),
      toggle: createFormToggleAction(testBed, `${phase}-downsampleSwitch`),
      setDownsampleInterval: createSetDownsampleIntervalAction(testBed, phase),
    },
  };
};
