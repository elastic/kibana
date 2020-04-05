/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { useForm } from '../../../../../shared_imports';
import { ThrottleSelectField } from './index';

describe('ThrottleSelectField', () => {
  it('renders correctly', () => {
    const Component = () => {
      const { form } = useForm();

      return (
        <ThrottleSelectField
          field={{
            path: 'path',
            type: 'type',
            errors: [],
            value: '',
            isPristine: false,
            isValidating: false,
            isValidated: true,
            isChangingValue: false,
            form,
            getErrorsMessages: jest.fn(),
            onChange: jest.fn(),
            setValue: jest.fn(),
            setErrors: jest.fn(),
            clearErrors: jest.fn(),
            validate: jest.fn(),
            reset: jest.fn(),
            __serializeOutput: jest.fn(),
          }}
          euiFieldProps={{ options: [] }}
        />
      );
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('SelectField')).toHaveLength(1);
  });
});
