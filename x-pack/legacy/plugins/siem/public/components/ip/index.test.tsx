/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { TestProviders } from '../../mock/test_providers';

import { Ip } from '.';

describe('Port', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders the the ip address', () => {
    const wrapper = mountWithIntl(
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
    const wrapper = mountWithIntl(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="draggable-content"]')
        .find('a')
        .first()
        .props().href
    ).toEqual('#/link-to/network/ip/10.1.2.3');
  });
});
