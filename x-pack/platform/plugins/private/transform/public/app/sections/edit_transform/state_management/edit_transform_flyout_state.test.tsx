/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren } from 'react';

import { renderHook, act } from '@testing-library/react';

import { getTransformConfigMock } from './__mocks__/transform_config';

import {
  useEditTransformFlyoutActions,
  EditTransformFlyoutProvider,
} from './edit_transform_flyout_state';
import { useFormField } from './selectors/form_field';
import { useIsFormTouched } from './selectors/is_form_touched';
import { useIsFormValid } from './selectors/is_form_valid';

describe('Transform: useEditTransformFlyoutActions/Selector()', () => {
  it('field updates should trigger form validation', () => {
    const transformConfigMock = getTransformConfigMock();
    const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
      <EditTransformFlyoutProvider config={transformConfigMock} dataViewId={'the-data-view-id'}>
        {children}
      </EditTransformFlyoutProvider>
    );

    // As we want to test how actions affect the state,
    // we set up this custom hook that combines hooks for
    // actions and state selection, so they react to the same redux store.
    const useHooks = () => ({
      actions: useEditTransformFlyoutActions(),
      isFormTouched: useIsFormTouched(),
      isFormValid: useIsFormValid(),
      frequency: useFormField('frequency'),
    });

    const { result } = renderHook(useHooks, { wrapper });

    act(() => {
      result.current.actions.setFormField({
        field: 'description',
        value: 'the-updated-description',
      });
    });

    expect(result.current.isFormTouched).toBe(true);
    expect(result.current.isFormValid).toBe(true);

    act(() => {
      result.current.actions.setFormField({
        field: 'description',
        value: transformConfigMock.description as string,
      });
    });

    expect(result.current.isFormTouched).toBe(false);
    expect(result.current.isFormValid).toBe(true);

    act(() => {
      result.current.actions.setFormField({
        field: 'frequency',
        value: 'the-invalid-value',
      });
    });

    expect(result.current.isFormTouched).toBe(true);
    expect(result.current.isFormValid).toBe(false);
    expect(result.current.frequency.errorMessages).toStrictEqual([
      'The frequency value is not valid.',
    ]);
  });
});
