/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { Connectors } from './connectors';
import { useMountAppended } from '../../../../utils/use_mount_appended';
import { TestProviders } from '../../../../mock';
import { ConnectorsDropdown } from './connectors_dropdown';
import { connectors } from './__mock__';

describe('Connectors', () => {
  const mount = useMountAppended();

  test('it renders', () => {
    const wrapper = shallow(
      <Connectors
        connectors={[]}
        disabled={false}
        selectedConnector={'none'}
        isLoading={false}
        onChangeConnector={jest.fn()}
        handleShowAddFlyout={jest.fn()}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('it shows the left side', () => {
    const wrapper = mount(
      <TestProviders>
        <Connectors
          connectors={[]}
          disabled={false}
          selectedConnector={'none'}
          isLoading={false}
          onChangeConnector={jest.fn()}
          handleShowAddFlyout={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="case-connectors-form-group"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it shows the right side', () => {
    const wrapper = mount(
      <TestProviders>
        <Connectors
          connectors={[]}
          disabled={false}
          selectedConnector={'none'}
          isLoading={false}
          onChangeConnector={jest.fn()}
          handleShowAddFlyout={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="case-connectors-form-row"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it shows the connectors dropdown', () => {
    const wrapper = mount(
      <TestProviders>
        <Connectors
          connectors={[]}
          disabled={false}
          selectedConnector={'none'}
          isLoading={false}
          onChangeConnector={jest.fn()}
          handleShowAddFlyout={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="case-connectors-dropdown"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it pass the correct props to child', () => {
    const onChange = jest.fn();

    const wrapper = shallow(
      <Connectors
        connectors={connectors}
        disabled={false}
        selectedConnector={'none'}
        isLoading={false}
        onChangeConnector={onChange}
        handleShowAddFlyout={jest.fn()}
      />
    );

    const connectorsDropdownComponent = wrapper.find(ConnectorsDropdown);
    expect(connectorsDropdownComponent.props().disabled).toEqual(false);
    expect(connectorsDropdownComponent.props().isLoading).toEqual(false);
    expect(connectorsDropdownComponent.props().connectors).toEqual(connectors);
    expect(connectorsDropdownComponent.props().selectedConnector).toEqual('none');
    expect(connectorsDropdownComponent.props().onChange).toEqual(onChange);
  });
});
