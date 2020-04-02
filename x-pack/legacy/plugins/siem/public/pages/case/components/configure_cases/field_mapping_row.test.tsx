/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiSuperSelectOption, EuiSuperSelect } from '@elastic/eui';

import { FieldMappingRow } from './field_mapping_row';
import { useMountAppended } from '../../../../utils/use_mount_appended';
import { TestProviders } from '../../../../mock';
import { ThirdPartyField } from '../../../../containers/case/configure/types';

const thirdPartyOptions: Array<EuiSuperSelectOption<ThirdPartyField>> = [
  {
    value: 'short_description',
    inputDisplay: <span>{'Short Description'}</span>,
    'data-test-subj': 'third-party-short-desc',
  },
  {
    value: 'description',
    inputDisplay: <span>{'Description'}</span>,
    'data-test-subj': 'third-party-desc',
  },
];

describe('FieldMappingRow', () => {
  const mount = useMountAppended();

  test('it renders', () => {
    const wrapper = shallow(
      <FieldMappingRow
        siemField="title"
        disabled={false}
        thirdPartyOptions={thirdPartyOptions}
        onChangeActionType={jest.fn()}
        onChangeThirdParty={jest.fn()}
        selectedActionType={'nothing'}
        selectedThirdParty={'short_description'}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('it passes thirdPartyOptions correctly', () => {
    const wrapper = mount(
      <FieldMappingRow
        siemField="title"
        disabled={false}
        thirdPartyOptions={thirdPartyOptions}
        onChangeActionType={jest.fn()}
        onChangeThirdParty={jest.fn()}
        selectedActionType={'nothing'}
        selectedThirdParty={'short_description'}
      />,
      { wrappingComponent: TestProviders }
    );

    const props = wrapper
      .find(EuiSuperSelect)
      .first()
      .props();

    expect(props.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'short_description',
          'data-test-subj': 'third-party-short-desc',
        }),
        expect.objectContaining({
          value: 'description',
          'data-test-subj': 'third-party-desc',
        }),
      ])
    );
  });

  test('it passes the correct actionTypeOptions', () => {
    const wrapper = mount(
      <FieldMappingRow
        siemField="title"
        disabled={false}
        thirdPartyOptions={thirdPartyOptions}
        onChangeActionType={jest.fn()}
        onChangeThirdParty={jest.fn()}
        selectedActionType={'nothing'}
        selectedThirdParty={'short_description'}
      />,
      { wrappingComponent: TestProviders }
    );

    const props = wrapper
      .find(EuiSuperSelect)
      .at(1)
      .props();

    expect(props.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'nothing',
          'data-test-subj': 'edit-update-option-nothing',
        }),
        expect.objectContaining({
          value: 'overwrite',
          'data-test-subj': 'edit-update-option-overwrite',
        }),
        expect.objectContaining({
          value: 'append',
          'data-test-subj': 'edit-update-option-append',
        }),
      ])
    );
  });
});
