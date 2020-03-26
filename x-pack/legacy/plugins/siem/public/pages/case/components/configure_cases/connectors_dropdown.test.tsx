/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiSuperSelect } from '@elastic/eui';

import { ConnectorsDropdown } from './connectors_dropdown';
import { useMountAppended } from '../../../../utils/use_mount_appended';
import { TestProviders } from '../../../../mock';
import { connectors } from './__mock__';

describe('ConnectorsDropdown', () => {
  const mount = useMountAppended();

  test('it renders', () => {
    const wrapper = shallow(
      <ConnectorsDropdown
        disabled={false}
        connectors={[]}
        isLoading={false}
        onChange={jest.fn()}
        selectedConnector={'none'}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('it formats the connectors correctly', () => {
    const wrapper = mount(
      <TestProviders>
        <ConnectorsDropdown
          disabled={false}
          connectors={connectors}
          isLoading={false}
          onChange={jest.fn()}
          selectedConnector={'none'}
        />
      </TestProviders>
    );

    const props = wrapper.find(EuiSuperSelect).props();

    expect(props.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: '123', 'data-test-subj': 'dropdown-connector-123' }),
        expect.objectContaining({ value: '456', 'data-test-subj': 'dropdown-connector-456' }),
      ])
    );
  });

  test('it disables the dropdown', () => {
    const wrapper = mount(
      <TestProviders>
        <ConnectorsDropdown
          disabled={true}
          connectors={connectors}
          isLoading={false}
          onChange={jest.fn()}
          selectedConnector={'none'}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="dropdown-connectors"]')
        .first()
        .prop('disabled')
    ).toEqual(true);
  });

  test('it selects the correct connector', () => {
    const wrapper = mount(
      <TestProviders>
        <ConnectorsDropdown
          disabled={true}
          connectors={connectors}
          isLoading={false}
          onChange={jest.fn()}
          selectedConnector={'123'}
        />
      </TestProviders>
    );

    expect(wrapper.find('button span').text()).toEqual('My Connector');
  });
});
