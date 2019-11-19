/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import '../../../jest.helpers';
import { shallow } from 'enzyme';
import { AlertsConfiguration, AlertsConfigurationProps } from './configuration';

jest.mock('ui/kfetch', () => ({
  kfetch: jest.fn().mockImplementation(() => {
    return {};
  }),
}));

const defaultProps: AlertsConfigurationProps = {
  clusterUuid: '1adsb23',
  emailAddress: 'test@elastic.co',
  onDone: jest.fn(),
};

describe('Configuration', () => {
  it('should render high level steps', () => {
    const component = shallow(<AlertsConfiguration {...defaultProps} />);
    expect(component.find('EuiSteps').shallow()).toMatchSnapshot();
  });

  it('should render step 1', () => {
    const component = shallow(<AlertsConfiguration {...defaultProps} />);
    const stepOne = component
      .find('EuiSteps')
      .shallow()
      .find('EuiStep')
      .at(0)
      .children()
      .shallow();
    expect(stepOne).toMatchSnapshot();
  });

  it('should render step 2', () => {
    const component = shallow(<AlertsConfiguration {...defaultProps} />);
    const stepOne = component
      .find('EuiSteps')
      .shallow()
      .find('EuiStep')
      .at(1)
      .children()
      .shallow();
    expect(stepOne).toMatchSnapshot();
  });

  it('should render step 3', () => {
    const component = shallow(<AlertsConfiguration {...defaultProps} />);
    const stepOne = component
      .find('EuiSteps')
      .shallow()
      .find('EuiStep')
      .at(2)
      .children()
      .shallow();
    expect(stepOne).toMatchSnapshot();
  });
});
