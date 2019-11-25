/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import '../../jest.helpers';
import { shallow, mount } from 'enzyme';
import { kfetch } from 'ui/kfetch';
import { AlertsStatus, AlertsStatusProps } from './status';
import { ALERT_TYPE_PREFIX } from '../../../common/constants';
import { getSetupModeState } from '../../lib/setup_mode';

jest.mock('../../lib/setup_mode', () => ({
  getSetupModeState: jest.fn(),
  addSetupModeCallback: jest.fn(),
  toggleSetupMode: jest.fn(),
}));

jest.mock('ui/kfetch', () => ({
  kfetch: jest.fn(),
}));

const defaultProps: AlertsStatusProps = {
  clusterUuid: '1adsb23',
  emailAddress: 'test@elastic.co',
};

describe('Status', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    (getSetupModeState as jest.Mock).mockReturnValue({
      enabled: false,
    });

    (kfetch as jest.Mock).mockReturnValue({
      data: [],
    });
  });

  it('should render without setup mode', () => {
    const component = shallow(<AlertsStatus {...defaultProps} />);
    expect(component).toMatchSnapshot();
  });

  it('should render a flyout when clicking the link', () => {
    const component = shallow(<AlertsStatus {...defaultProps} />);

    component.find('EuiLink').simulate('click');
    expect(component.find('EuiFlyout')).toMatchSnapshot();
  });

  it('should render a success message if all alerts have been migrated and in setup mode', async () => {
    (kfetch as jest.Mock).mockReturnValue({
      data: [
        {
          alertTypeId: ALERT_TYPE_PREFIX,
        },
      ],
    });

    (getSetupModeState as jest.Mock).mockReturnValue({
      enabled: true,
    });

    const component = mount(<AlertsStatus {...defaultProps} />);

    await new Promise(resolve => process.nextTick(resolve));

    component.update();
    expect(component.find('EuiCallOut')).toMatchSnapshot();
  });

  it('should close the flyout if setup mode is disabled', async () => {
    const component = mount(<AlertsStatus {...defaultProps} />);
    component.find('EuiLink').simulate('click');
    await new Promise(resolve => process.nextTick(resolve));
    expect(component.find('EuiFlyout').exists()).toBe(false);
  });
});
