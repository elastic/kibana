/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { render } from '@testing-library/react';
import { Formik } from 'formik';
import React from 'react';

import { FormRow } from './form_row';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiFormRow: jest.fn(({ children }: any) => <div>{children}</div>),
  };
});

const MockedEuiFormRow = EuiFormRow as unknown as jest.Mock;

describe('FormRow', () => {
  it('should render form row with correct error states', () => {
    const assertions = [
      { error: 'Error', touched: true, isInvalid: true },
      { error: 'Error', touched: false, isInvalid: false },
      { error: undefined, touched: true, isInvalid: false },
    ];
    assertions.forEach(({ error, touched, isInvalid }) => {
      MockedEuiFormRow.mockClear();

      render(
        <Formik
          onSubmit={jest.fn()}
          initialValues={{ email: '' }}
          initialErrors={{ email: error }}
          initialTouched={{ email: touched }}
        >
          <FormRow>
            <input name="email" />
          </FormRow>
        </Formik>
      );

      expect(MockedEuiFormRow).toHaveBeenCalledWith(
        expect.objectContaining({
          error,
          isInvalid,
        }),
        expect.anything()
      );
    });
  });
});
