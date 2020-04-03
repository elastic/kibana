/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { ClosureOptionsRadio } from './closure_options_radio';
import { useMountAppended } from '../../../../utils/use_mount_appended';
import { TestProviders } from '../../../../mock';

describe('ClosureOptionsRadio', () => {
  const mount = useMountAppended();

  test('it renders', () => {
    const wrapper = shallow(
      <ClosureOptionsRadio
        disabled={false}
        closureTypeSelected="close-by-user"
        onChangeClosureType={jest.fn()}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="closure-options-radio-group"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it shows the correct number of radio buttons', () => {
    const wrapper = mount(
      <ClosureOptionsRadio
        disabled={false}
        closureTypeSelected="close-by-user"
        onChangeClosureType={jest.fn()}
      />,
      { wrappingComponent: TestProviders }
    );

    expect(wrapper.find('input[name="closure_options"]')).toHaveLength(2);
  });

  test('it renders the correct radio buttons', () => {
    const wrapper = mount(
      <ClosureOptionsRadio
        disabled={false}
        closureTypeSelected="close-by-user"
        onChangeClosureType={jest.fn()}
      />,
      { wrappingComponent: TestProviders }
    );

    expect(wrapper.find('input[id="close-by-user"]')).toBeDefined();
    expect(wrapper.find('input[id="close-by-pushing"]')).toBeDefined();
  });

  test('it disables correctly', () => {
    const wrapper = mount(
      <ClosureOptionsRadio
        disabled={true}
        closureTypeSelected="close-by-user"
        onChangeClosureType={jest.fn()}
      />,
      { wrappingComponent: TestProviders }
    );

    expect(wrapper.find('input[id="close-by-user"]').prop('disabled')).toEqual(true);
    expect(wrapper.find('input[id="close-by-pushing"]').prop('disabled')).toEqual(true);
  });

  test('it selects the correct radio button', () => {
    const wrapper = mount(
      <ClosureOptionsRadio
        disabled={false}
        closureTypeSelected="close-by-pushing"
        onChangeClosureType={jest.fn()}
      />,
      { wrappingComponent: TestProviders }
    );

    expect(wrapper.find('input[id="close-by-pushing"]').prop('checked')).toEqual(true);
  });

  test('it calls the onChangeClosureType function', () => {
    const onChangeClosureType = jest.fn();

    const wrapper = mount(
      <ClosureOptionsRadio
        disabled={false}
        closureTypeSelected="close-by-user"
        onChangeClosureType={onChangeClosureType}
      />,
      { wrappingComponent: TestProviders }
    );

    wrapper.find('input[id="close-by-pushing"]').simulate('change');
    wrapper.update();
    expect(onChangeClosureType).toHaveBeenCalled();
    expect(onChangeClosureType).toHaveBeenCalledWith('close-by-pushing');
  });
});
