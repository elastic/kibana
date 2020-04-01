/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { AddItem } from './index';
import { useForm } from '../../../../../shared_imports';

describe('AddItem', () => {
  it('renders correctly against the snapshot', () => {
    const Component = () => {
      const { form } = useForm();

      return (
        <AddItem
          addText="text"
          field={{
            path: 'path',
            type: 'type',
            value: [],
            isPristine: false,
            isValidating: false,
            isValidated: false,
            isChangingValue: false,
            form,
            errors: [],
            getErrorsMessages: jest.fn(),
            onChange: jest.fn(),
            setValue: jest.fn(),
            setErrors: jest.fn(),
            clearErrors: jest.fn(),
            validate: jest.fn(),
            reset: jest.fn(),
            __serializeOutput: jest.fn(),
          }}
          dataTestSubj="dataTestSubj"
          idAria="idAria"
          isDisabled={false}
        />
      );
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive()).toMatchSnapshot();
  });
});
