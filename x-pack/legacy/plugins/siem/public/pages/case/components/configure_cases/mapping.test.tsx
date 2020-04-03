/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';

import { TestProviders } from '../../../../mock';
import { Mapping, MappingProps } from './mapping';
import { mapping } from './__mock__';

describe('Mapping', () => {
  let wrapper: ReactWrapper;
  const onChangeMapping = jest.fn();
  const setEditFlyoutVisibility = jest.fn();
  const props: MappingProps = {
    disabled: false,
    mapping,
    updateConnectorDisabled: false,
    onChangeMapping,
    setEditFlyoutVisibility,
  };

  beforeAll(() => {
    wrapper = mount(<Mapping {...props} />, { wrappingComponent: TestProviders });
  });

  test('it shows mapping form group', () => {
    expect(
      wrapper
        .find('[data-test-subj="case-mapping-form-group"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it shows mapping form row', () => {
    expect(
      wrapper
        .find('[data-test-subj="case-mapping-form-row"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it shows the update button', () => {
    expect(
      wrapper
        .find('[data-test-subj="case-mapping-update-connector-button"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it shows the field mapping', () => {
    expect(
      wrapper
        .find('[data-test-subj="case-mapping-field"]')
        .first()
        .exists()
    ).toBe(true);
  });
});
