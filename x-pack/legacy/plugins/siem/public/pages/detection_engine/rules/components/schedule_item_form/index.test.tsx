/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { ScheduleItem } from './index';
import { useForm } from '../../../../../shared_imports';

describe('ScheduleItem', () => {
  it('renders correctly', () => {
    const Component = () => {
      const { form } = useForm();

      return (
        <ScheduleItem
          dataTestSubj="schedule-item"
          idAria="idAria"
          isDisabled={false}
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
        />
      );
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('[data-test-subj="schedule-item"]')).toHaveLength(1);
  });
});
