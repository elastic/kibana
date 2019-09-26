/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { InfoAlerts } from './info_alerts';

describe('InfoAlerts component', () => {
  it('renders null if both alert flags are false', () => {
    const wrapper = shallow(
      <InfoAlerts showAddRoleAlert={false} showEnableMonitoringAlert={false} />
    );

    expect(wrapper).toMatchSnapshot();
    expect(wrapper.instance()).toBeNull();
  });

  it('renders AddRoleAlert if flag is true', () => {
    const wrapper = shallow(
      <InfoAlerts showAddRoleAlert={true} showEnableMonitoringAlert={false} />
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('renders EnableMonitoringAlert if flag is true', () => {
    const wrapper = shallow(
      <InfoAlerts showAddRoleAlert={false} showEnableMonitoringAlert={true} />
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('renders AddRoleAlert and EnableMonitoringAlert if both flags are true', () => {
    const wrapper = shallow(
      <InfoAlerts showAddRoleAlert={true} showEnableMonitoringAlert={true} />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
