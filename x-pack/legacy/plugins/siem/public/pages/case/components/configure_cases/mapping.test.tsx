/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { useMountAppended } from '../../../../utils/use_mount_appended';
import { TestProviders } from '../../../../mock';
import { Mapping } from './mapping';
import { mapping } from './__mock__';

describe('Mapping', () => {
  const mount = useMountAppended();

  test('it renders', () => {
    const wrapper = shallow(
      <Mapping
        disabled={false}
        mapping={mapping}
        onChangeMapping={jest.fn()}
        updateConnectorDisabled={false}
        setEditFlyoutVisibility={jest.fn()}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('it shows the left side', () => {
    const wrapper = mount(
      <Mapping
        disabled={false}
        mapping={mapping}
        onChangeMapping={jest.fn()}
        updateConnectorDisabled={false}
        setEditFlyoutVisibility={jest.fn()}
      />,
      { wrappingComponent: TestProviders }
    );

    expect(
      wrapper
        .find('[data-test-subj="case-mapping-form-group"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it shows the right side', () => {
    const wrapper = mount(
      <Mapping
        disabled={false}
        mapping={mapping}
        onChangeMapping={jest.fn()}
        updateConnectorDisabled={false}
        setEditFlyoutVisibility={jest.fn()}
      />,
      { wrappingComponent: TestProviders }
    );

    expect(
      wrapper
        .find('[data-test-subj="case-mapping-form-row"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it shows the update button', () => {
    const wrapper = mount(
      <Mapping
        disabled={false}
        mapping={mapping}
        onChangeMapping={jest.fn()}
        updateConnectorDisabled={false}
        setEditFlyoutVisibility={jest.fn()}
      />,
      { wrappingComponent: TestProviders }
    );

    expect(
      wrapper
        .find('[data-test-subj="case-mapping-update-connector-button"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it shows the field mapping', () => {
    const wrapper = mount(
      <Mapping
        disabled={false}
        mapping={mapping}
        onChangeMapping={jest.fn()}
        updateConnectorDisabled={false}
        setEditFlyoutVisibility={jest.fn()}
      />,
      { wrappingComponent: TestProviders }
    );

    expect(
      wrapper
        .find('[data-test-subj="case-mapping-field"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it call the callback when pressing the update button', () => {
    const setEditFlyoutVisibility = jest.fn();

    const wrapper = mount(
      <Mapping
        disabled={false}
        mapping={mapping}
        onChangeMapping={jest.fn()}
        updateConnectorDisabled={false}
        setEditFlyoutVisibility={setEditFlyoutVisibility}
      />,
      { wrappingComponent: TestProviders }
    );

    wrapper.find('button[data-test-subj="case-mapping-update-connector-button"]').simulate('click');

    wrapper.update();

    expect(setEditFlyoutVisibility).toHaveBeenCalled();
    expect(setEditFlyoutVisibility).toHaveBeenCalledWith({});
  });
});
