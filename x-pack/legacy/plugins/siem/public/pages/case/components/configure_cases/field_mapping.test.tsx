/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { FieldMapping } from './field_mapping';
import { mapping } from './__mock__';
import { FieldMappingRow } from './field_mapping_row';
import { defaultMapping } from '../../../../lib/connectors/config';

describe('FieldMappingRow', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <FieldMapping disabled={false} mapping={mapping} onChangeMapping={jest.fn()} />
    );

    expect(
      wrapper
        .find('[data-test-subj="case-configure-field-mapping-cols"]')
        .first()
        .exists()
    ).toBe(true);

    expect(
      wrapper
        .find('[data-test-subj="case-configure-field-mapping-row-wrapper"]')
        .first()
        .exists()
    ).toBe(true);

    expect(wrapper.find(FieldMappingRow).length).toEqual(3);
  });

  test('it shows the correct number of FieldMappingRow with default mapping', () => {
    const wrapper = shallow(
      <FieldMapping disabled={false} mapping={null} onChangeMapping={jest.fn()} />
    );

    expect(wrapper.find(FieldMappingRow).length).toEqual(3);
  });

  test('it pass the corrects props to mapping row', () => {
    const wrapper = shallow(
      <FieldMapping disabled={false} mapping={mapping} onChangeMapping={jest.fn()} />
    );

    const rows = wrapper.find(FieldMappingRow);
    rows.forEach((row, index) => {
      expect(row.prop('siemField')).toEqual(mapping[index].source);
      expect(row.prop('selectedActionType')).toEqual(mapping[index].actionType);
      expect(row.prop('selectedThirdParty')).toEqual(mapping[index].target);
    });
  });

  test('it pass the default mapping when mapping is null', () => {
    const wrapper = shallow(
      <FieldMapping disabled={false} mapping={null} onChangeMapping={jest.fn()} />
    );

    const rows = wrapper.find(FieldMappingRow);
    rows.forEach((row, index) => {
      expect(row.prop('siemField')).toEqual(defaultMapping[index].source);
      expect(row.prop('selectedActionType')).toEqual(defaultMapping[index].actionType);
      expect(row.prop('selectedThirdParty')).toEqual(defaultMapping[index].target);
    });
  });

  test('it should show zero rows on empty array', () => {
    const wrapper = shallow(
      <FieldMapping disabled={false} mapping={[]} onChangeMapping={jest.fn()} />
    );

    expect(wrapper.find(FieldMappingRow).length).toEqual(0);
  });
});
