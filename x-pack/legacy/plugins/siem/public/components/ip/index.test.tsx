/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { TestProviders } from '../../mock/test_providers';
import { useMountAppended } from '../../utils/use_mount_appended';

import { Ip } from '.';

describe('Port', () => {
  const mount = useMountAppended();

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders the the ip address', () => {
    const wrapper = mount(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="formatted-ip"]')
        .first()
        .text()
    ).toEqual('10.1.2.3');
  });

  test('it hyperlinks to the network/ip page', () => {
    const wrapper = mount(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="draggable-content-destination.ip"]')
        .find('a')
        .first()
        .props().href
    ).toEqual('#/link-to/network/ip/10.1.2.3');
  });
});
