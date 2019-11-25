/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import '../../../jest.helpers';
import { shallow, ShallowWrapper, mount, ReactWrapper } from 'enzyme';
import { kfetch } from 'ui/kfetch';
import { AlertsConfiguration, AlertsConfigurationProps } from './configuration';

jest.mock('ui/kfetch', () => ({
  kfetch: jest.fn(),
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

  function getStep(component: ShallowWrapper, index: number) {
    return component
      .find('EuiSteps')
      .shallow()
      .find('EuiStep')
      .at(index)
      .children()
      .shallow();
  }

  describe('shallow view', () => {
    it('should render step 1', () => {
      const component = shallow(<AlertsConfiguration {...defaultProps} />);
      const stepOne = getStep(component, 0);
      expect(stepOne).toMatchSnapshot();
    });

    it('should render step 2', () => {
      const component = shallow(<AlertsConfiguration {...defaultProps} />);
      const stepTwo = getStep(component, 1);
      expect(stepTwo).toMatchSnapshot();
    });

    it('should render step 3', () => {
      const component = shallow(<AlertsConfiguration {...defaultProps} />);
      const stepThree = getStep(component, 2);
      expect(stepThree).toMatchSnapshot();
    });
  });

  describe('selected action', () => {
    const actionId = 'a123b';
    let component: ReactWrapper;
    beforeEach(async () => {
      (kfetch as jest.Mock).mockImplementation(() => {
        return {
          data: [
            {
              actionTypeId: '.email',
              id: actionId,
              config: {},
            },
          ],
        };
      });

      component = mount(<AlertsConfiguration {...defaultProps} />);
      await new Promise(resolve => process.nextTick(resolve));
      await component.update();
    });

    it('reflect in Step1', async () => {
      expect(component.find('Step1').prop('selectedEmailActionId')).toBe(actionId);
    });

    it('should enable Step2', async () => {
      expect(component.find('Step2').prop('isDisabled')).toBe(false);
    });

    it('should enable Step3', async () => {
      expect(component.find('Step3').prop('isDisabled')).toBe(false);
    });
  });

  describe('edit action', () => {
    let component: ReactWrapper;
    beforeEach(async () => {
      (kfetch as jest.Mock).mockImplementation(() => {
        return {
          data: [],
        };
      });

      component = mount(<AlertsConfiguration {...defaultProps} />);
      await new Promise(resolve => process.nextTick(resolve));
      await component.update();
    });

    it('disable Step2', async () => {
      expect(component.find('Step2').prop('isDisabled')).toBe(true);
    });

    it('disable Step3', async () => {
      expect(component.find('Step3').prop('isDisabled')).toBe(true);
    });
  });

  describe('no email address', () => {
    let component: ReactWrapper;
    beforeEach(async () => {
      (kfetch as jest.Mock).mockImplementation(() => {
        return {
          data: [
            {
              actionTypeId: '.email',
              id: 'actionId',
              config: {},
            },
          ],
        };
      });

      component = mount(<AlertsConfiguration {...defaultProps} emailAddress="" />);
      await new Promise(resolve => process.nextTick(resolve));
      await component.update();
    });

    it('should disable Step3', async () => {
      expect(component.find('Step3').prop('isDisabled')).toBe(true);
    });
  });
});
