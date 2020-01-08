/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import '../../../jest.helpers';
import { shallow } from 'enzyme';
import { Step2, GetStep2Props } from './step2';

describe('Step2', () => {
  const defaultProps: GetStep2Props = {
    emailAddress: 'test@test.com',
    setEmailAddress: jest.fn(),
    showFormErrors: false,
    formErrors: { email: null },
    isDisabled: false,
  };

  it('should render normally', () => {
    const component = shallow(<Step2 {...defaultProps} />);
    expect(component).toMatchSnapshot();
  });

  it('should set the email address properly', () => {
    const newEmail = 'email@email.com';
    const component = shallow(<Step2 {...defaultProps} />);
    component.find('EuiFieldText').simulate('change', { target: { value: newEmail } });
    expect(defaultProps.setEmailAddress).toHaveBeenCalledWith(newEmail);
  });

  it('should show form errors', () => {
    const customProps = {
      showFormErrors: true,
      formErrors: {
        email: 'This is required',
      },
    };
    const component = shallow(<Step2 {...defaultProps} {...customProps} />);
    expect(component).toMatchSnapshot();
  });

  it('should disable properly', () => {
    const customProps = {
      isDisabled: true,
    };
    const component = shallow(<Step2 {...defaultProps} {...customProps} />);
    expect(component.find('EuiFieldText').prop('disabled')).toBe(true);
  });
});
