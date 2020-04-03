/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';

import { Connectors, Props } from './connectors';
import { TestProviders } from '../../../../mock';
import { ConnectorsDropdown } from './connectors_dropdown';
import { connectors } from './__mock__';

describe('Connectors', () => {
  let wrapper: ReactWrapper;
  const onChangeConnector = jest.fn();
  const handleShowAddFlyout = jest.fn();
  const props: Props = {
    disabled: false,
    connectors,
    selectedConnector: 'none',
    isLoading: false,
    onChangeConnector,
    handleShowAddFlyout,
  };

  beforeAll(() => {
    wrapper = mount(<Connectors {...props} />, { wrappingComponent: TestProviders });
  });

  test('it shows the connectors from group', () => {
    expect(
      wrapper
        .find('[data-test-subj="case-connectors-form-group"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it shows the connectors form row', () => {
    expect(
      wrapper
        .find('[data-test-subj="case-connectors-form-row"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it shows the connectors dropdown', () => {
    expect(
      wrapper
        .find('[data-test-subj="case-connectors-dropdown"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it pass the correct props to child', () => {
    const connectorsDropdownProps = wrapper.find(ConnectorsDropdown).props();
    expect(connectorsDropdownProps).toMatchObject({
      disabled: false,
      isLoading: false,
      connectors,
      selectedConnector: 'none',
      onChange: props.onChangeConnector,
    });
  });
});
