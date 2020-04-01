/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import '../../../jest.helpers';
import { shallow } from 'enzyme';
import { Step3 } from './step3';

describe('Step3', () => {
  const defaultProps = {
    isSaving: false,
    isDisabled: false,
    save: jest.fn(),
    error: null,
  };

  it('should render normally', () => {
    const component = shallow(<Step3 {...defaultProps} />);
    expect(component).toMatchSnapshot();
  });

  it('should save properly', () => {
    const component = shallow(<Step3 {...defaultProps} />);
    component.find('EuiButton').simulate('click');
    expect(defaultProps.save).toHaveBeenCalledWith();
  });

  it('should show a saving state', () => {
    const customProps = { isSaving: true };
    const component = shallow(<Step3 {...defaultProps} {...customProps} />);
    expect(component).toMatchSnapshot();
  });

  it('should show a disabled state', () => {
    const customProps = { isDisabled: true };
    const component = shallow(<Step3 {...defaultProps} {...customProps} />);
    expect(component).toMatchSnapshot();
  });

  it('should show an error', () => {
    const customProps = { error: 'Test error' };
    const component = shallow(<Step3 {...defaultProps} {...customProps} />);
    expect(component).toMatchSnapshot();
  });
});
