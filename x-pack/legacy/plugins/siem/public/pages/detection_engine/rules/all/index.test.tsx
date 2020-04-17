/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_light.json';

import { AllRules } from './index';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useHistory: jest.fn(),
  };
});

const theme = () => ({ eui: euiDarkVars, darkMode: true });

describe('AllRules', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <AllRules
        createPrePackagedRules={jest.fn()}
        hasNoPermissions={false}
        loading={false}
        loadingCreatePrePackagedRules={false}
        refetchPrePackagedRulesStatus={jest.fn()}
        rulesCustomInstalled={0}
        rulesInstalled={0}
        rulesNotInstalled={0}
        rulesNotUpdated={0}
        setRefreshRulesData={jest.fn()}
      />
    );

    expect(wrapper.find('[title="All rules"]')).toHaveLength(1);
  });

  it('renders rules tab', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <AllRules
          createPrePackagedRules={jest.fn()}
          hasNoPermissions={false}
          loading={false}
          loadingCreatePrePackagedRules={false}
          refetchPrePackagedRulesStatus={jest.fn()}
          rulesCustomInstalled={0}
          rulesInstalled={0}
          rulesNotInstalled={0}
          rulesNotUpdated={0}
          setRefreshRulesData={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper).toMatchSnapshot();
    expect(wrapper.find('[data-test-subj="rules-table"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="monitoring-table"]')).toHaveLength(0);
  });
});
