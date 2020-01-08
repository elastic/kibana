/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { mountHook } from '../../../../../../../../../../test_utils/enzyme_helpers';

import { CreateAnalyticsFlyout } from './create_analytics_flyout';

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

describe('Data Frame Analytics: <CreateAnalyticsFlyout />', () => {
  test('Minimal initialization', () => {
    const { getLastHookValue } = getMountedHook();
    const props = getLastHookValue();
    const wrapper = mount(<CreateAnalyticsFlyout {...props} />);

    expect(wrapper.find('[data-test-subj="mlDataFrameAnalyticsFlyoutHeaderTitle"]').text()).toBe(
      'Create analytics job'
    );
  });
});
