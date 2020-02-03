/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../mock/test_providers';
import { useMountAppended } from '../../utils/use_mount_appended';

import { Port } from '.';

describe('Port', () => {
  const mount = useMountAppended();

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <Port contextId="test" eventId="abcd" fieldName="destination.port" value="443" />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the port', () => {
    const wrapper = mount(
      <TestProviders>
        <Port contextId="test" eventId="abcd" fieldName="destination.port" value="443" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="port"]')
        .first()
        .text()
    ).toEqual('443');
  });

  test('it hyperlinks links destination.port to an external service that describes the purpose of the port', () => {
    const wrapper = mount(
      <TestProviders>
        <Port contextId="test" eventId="abcd" fieldName="destination.port" value="443" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="port-or-service-name-link"]')
        .first()
        .props().href
    ).toEqual(
      'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=443'
    );
  });

  test('it renders an external link', () => {
    const wrapper = mount(
      <TestProviders>
        <Port contextId="test" eventId="abcd" fieldName="destination.port" value="443" />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="external-link-icon"]')
        .first()
        .exists()
    ).toBe(true);
  });
});
