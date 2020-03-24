/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { ClosureOptions } from './closure_options';
import { useMountAppended } from '../../../../utils/use_mount_appended';
import { TestProviders } from '../../../../mock';
import { ClosureOptionsRadio } from './closure_options_radio';

describe('ClosureOptions', () => {
  const mount = useMountAppended();

  test('it renders', () => {
    const wrapper = shallow(
      <ClosureOptions
        disabled={false}
        closureTypeSelected="close-by-user"
        onChangeClosureType={jest.fn()}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('it shows the left side', () => {
    const wrapper = mount(
      <TestProviders>
        <ClosureOptions
          disabled={false}
          closureTypeSelected="close-by-user"
          onChangeClosureType={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="case-closure-options-form-group"]')
        .first()
        .exists()
    ).toBe(true);
  });
  test('it shows the right side', () => {
    const wrapper = mount(
      <TestProviders>
        <ClosureOptions
          disabled={false}
          closureTypeSelected="close-by-user"
          onChangeClosureType={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="case-closure-options-form-row"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it pass the correct props to child', () => {
    const onChangeClosureType = jest.fn();

    const wrapper = shallow(
      <ClosureOptions
        disabled={false}
        closureTypeSelected="close-by-user"
        onChangeClosureType={onChangeClosureType}
      />
    );

    const closureOptionsRadioComponent = wrapper.find(ClosureOptionsRadio);
    expect(closureOptionsRadioComponent.props().disabled).toEqual(false);
    expect(closureOptionsRadioComponent.props().closureTypeSelected).toEqual('close-by-user');
    expect(closureOptionsRadioComponent.props().onChangeClosureType).toEqual(onChangeClosureType);
  });
});
