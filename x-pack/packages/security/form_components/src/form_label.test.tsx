/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render } from '@testing-library/react';
import type { FormikContextType } from 'formik';
import { Formik, FormikConsumer } from 'formik';
import React from 'react';

import { FormChangesProvider } from './form_changes';
import { FormLabel } from './form_label';

describe('FormLabel', () => {
  it('should report form changes', () => {
    const onSubmit = jest.fn();
    const report = jest.fn();

    let formik: FormikContextType<any>;
    render(
      <Formik onSubmit={onSubmit} initialValues={{ email: '' }}>
        <FormChangesProvider value={{ count: 0, report }}>
          <FormLabel for="email" />
          <FormikConsumer>
            {(value) => {
              formik = value;
              return null;
            }}
          </FormikConsumer>
        </FormChangesProvider>
      </Formik>
    );

    expect(report).toHaveBeenLastCalledWith(true);

    act(() => {
      formik.setFieldValue('email', 'mail@example.com');
    });

    expect(report).toHaveBeenLastCalledWith(false);
  });
});
