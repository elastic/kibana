/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { mountHook } from '../../../../../../../../../../test_utils/enzyme_helpers';

import { CreateAnalyticsForm } from './create_analytics_form';

import { KibanaContext } from '../../../../../contexts/kibana';
import { kibanaContextValueMock } from '../../../../../contexts/kibana/__mocks__/kibana_context_value';

import { useCreateAnalyticsForm } from '../../hooks/use_create_analytics_form';

const getMountedHook = () =>
  mountHook(
    () => useCreateAnalyticsForm(),
    ({ children }) => (
      <KibanaContext.Provider value={kibanaContextValueMock}>{children}</KibanaContext.Provider>
    )
  );

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

describe('Data Frame Analytics: <CreateAnalyticsForm />', () => {
  test('Minimal initialization', () => {
    const { getLastHookValue } = getMountedHook();
    const props = getLastHookValue();
    const wrapper = mount(
      <KibanaContext.Provider value={kibanaContextValueMock}>
        <CreateAnalyticsForm {...props} />
      </KibanaContext.Provider>
    );

    const euiFormRows = wrapper.find('EuiFormRow');
    expect(euiFormRows.length).toBe(9);

    const row1 = euiFormRows.at(0);
    expect(row1.find('label').text()).toBe('Job type');

    const options = row1.find('option');
    expect(options.at(0).props().value).toBe('');
    expect(options.at(1).props().value).toBe('outlier_detection');
    expect(options.at(2).props().value).toBe('regression');

    const row2 = euiFormRows.at(1);
    expect(row2.find('EuiSwitch').text()).toBe('Enable advanced editor');
  });
});
