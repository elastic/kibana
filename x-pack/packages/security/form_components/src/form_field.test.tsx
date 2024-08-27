/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFieldText } from '@elastic/eui';
import { mount } from 'enzyme';
import { Formik } from 'formik';
import React from 'react';

import { createFieldValidator, FormField } from './form_field';

const onSubmit = jest.fn();

describe('FormField', () => {
  it('should render text field by default', () => {
    const wrapper = mount(
      <Formik onSubmit={onSubmit} initialValues={{ email: '' }}>
        <FormField name="email" />
      </Formik>
    );

    expect(wrapper.exists(EuiFieldText)).toEqual(true);
  });

  it('should render custom component if specified', () => {
    const wrapper = mount(
      <Formik onSubmit={onSubmit} initialValues={{ count: '' }}>
        <FormField as={EuiFieldNumber} name="count" />
      </Formik>
    );

    expect(wrapper.exists(EuiFieldNumber)).toEqual(true);
  });

  it('should render component with correct field props and event handlers', () => {
    const wrapper = mount(
      <Formik onSubmit={onSubmit} initialValues={{ email: 'mail@example.com' }}>
        <FormField name="email" />
      </Formik>
    );

    expect(wrapper.find(EuiFieldText).props()).toEqual(
      expect.objectContaining({
        name: 'email',
        value: 'mail@example.com',
        onChange: expect.any(Function),
        onBlur: expect.any(Function),
      })
    );
  });

  it('should mark as invalid if field has errors and has been touched', () => {
    const assertions = [
      { error: 'Error', touched: true, isInvalid: true },
      { error: 'Error', touched: false, isInvalid: false },
      { error: undefined, touched: true, isInvalid: false },
    ];
    assertions.forEach(({ error, touched, isInvalid }) => {
      const wrapper = mount(
        <Formik
          onSubmit={onSubmit}
          initialValues={{ email: '' }}
          initialErrors={{ email: error }}
          initialTouched={{ email: touched }}
        >
          <FormField name="email" />
        </Formik>
      );
      expect(wrapper.find(EuiFieldText).props()).toEqual(expect.objectContaining({ isInvalid }));
    });
  });
});

describe('createFieldValidator', () => {
  it('should validate required field', () => {
    const validate = createFieldValidator({
      required: 'Error',
    });

    expect(validate(undefined)).toEqual('Error');
    expect(validate(null)).toEqual('Error');
    expect(validate('')).toEqual('Error');

    expect(validate(0)).toBeUndefined();
    expect(validate(1)).toBeUndefined();
    expect(validate('a')).toBeUndefined();
    expect(validate({})).toBeUndefined();
    expect(validate([])).toBeUndefined();
  });

  it('should validate field pattern', () => {
    const validate = createFieldValidator({
      pattern: {
        value: /^[a-z]{2}$/,
        message: 'Error',
      },
    });

    expect(validate(undefined)).toEqual('Error');
    expect(validate(null)).toEqual('Error');
    expect(validate(0)).toEqual('Error');
    expect(validate(1)).toEqual('Error');
    expect(validate('a')).toEqual('Error');

    expect(validate('ab')).toBeUndefined();
  });

  it('should validate minimum length ', () => {
    const validate = createFieldValidator({
      minLength: {
        value: 2,
        message: 'Error',
      },
    });

    expect(validate(undefined)).toEqual('Error');
    expect(validate(null)).toEqual('Error');
    expect(validate('a')).toEqual('Error');
    expect(validate([0])).toEqual('Error');

    expect(validate('ab')).toBeUndefined();
    expect(validate([0, 1])).toBeUndefined();
  });

  it('should validate maximum length', () => {
    const validate = createFieldValidator({
      maxLength: {
        value: 2,
        message: 'Error',
      },
    });

    expect(validate('abc')).toEqual('Error');
    expect(validate([0, 1, 3])).toEqual('Error');

    expect(validate(undefined)).toBeUndefined();
    expect(validate(null)).toBeUndefined();
    expect(validate('ab')).toBeUndefined();
    expect(validate([0, 1])).toBeUndefined();
  });

  it('should validate minimum value', () => {
    const validate = createFieldValidator({
      min: {
        value: 2,
        message: 'Error',
      },
    });

    expect(validate(undefined)).toEqual('Error');
    expect(validate(null)).toEqual('Error');
    expect(validate(1)).toEqual('Error');
    expect(validate('1')).toEqual('Error');

    expect(validate(2)).toBeUndefined();
    expect(validate('2')).toBeUndefined();
  });

  it('should validate maximum value', () => {
    const validate = createFieldValidator({
      max: {
        value: 2,
        message: 'Error',
      },
    });

    expect(validate(undefined)).toEqual('Error');
    expect(validate(3)).toEqual('Error');
    expect(validate('3')).toEqual('Error');

    expect(validate(null)).toBeUndefined();
    expect(validate(2)).toBeUndefined();
    expect(validate('2')).toBeUndefined();
  });
});
