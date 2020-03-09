/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount, shallow } from 'enzyme';
import { EuiProgress, EuiButtonGroup } from '@elastic/eui';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_light.json';

import { StepAboutRuleToggleDetails } from './';
import { mockAboutStepRule } from '../../../all/__mocks__/mock';

jest.mock('react', () => {
  const r = jest.requireActual('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...r, memo: (x: any) => x };
});

const theme = () => ({ eui: euiDarkVars, darkMode: true });

describe('StepAboutRuleToggleDetails', () => {
  test('it renders loading component when `loading` is true', () => {
    const wrapper = shallow(
      <StepAboutRuleToggleDetails loading={true} stepData={mockAboutStepRule} />
    );

    expect(wrapper.find(EuiProgress).exists()).toBeTruthy();
  });

  describe('note value does NOT exist', () => {
    test('it does not render toggle buttons', () => {
      const mockAboutStepWithoutNote = {
        ...mockAboutStepRule,
        note: '',
      };
      const wrapper = shallow(
        <StepAboutRuleToggleDetails loading={false} stepData={mockAboutStepWithoutNote} />
      );

      expect(wrapper.find(EuiButtonGroup).exists()).toBeFalsy();
      expect(
        wrapper
          .find('[data-test-subj="stepAboutRuleDetailsToggleDescriptionText"]')
          .at(0)
          .text()
      ).toEqual(mockAboutStepWithoutNote.description);
    });

    test('it does not render description as part of the description list', () => {
      const mockAboutStepWithoutNote = {
        ...mockAboutStepRule,
        note: '',
      };
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <StepAboutRuleToggleDetails loading={false} stepData={mockAboutStepWithoutNote} />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="stepAboutRuleDetailsToggleDescriptionText"]')
          .at(0)
          .text()
      ).toEqual(mockAboutStepWithoutNote.description);
    });
  });

  describe('note value does exist', () => {
    test('it renders toggle buttons, defaulted to `about`', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <StepAboutRuleToggleDetails loading={false} stepData={mockAboutStepRule} />
        </ThemeProvider>
      );

      expect(wrapper.find(EuiButtonGroup).exists()).toBeTruthy();
      expect(
        wrapper
          .find('EuiButtonToggle[id="about"]')
          .at(0)
          .prop('isSelected')
      ).toBeTruthy();
      expect(
        wrapper
          .find('EuiButtonToggle[id="notes"]')
          .at(0)
          .prop('isSelected')
      ).toBeFalsy();
    });

    test('it allows users to toggle between `about` and `note`', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <StepAboutRuleToggleDetails loading={false} stepData={mockAboutStepRule} />
        </ThemeProvider>
      );

      expect(wrapper.find('EuiButtonGroup[idSelected="about"]').exists()).toBeTruthy();
      expect(wrapper.find('EuiButtonGroup[idSelected="notes"]').exists()).toBeFalsy();

      wrapper
        .find('input[title="Notes"]')
        .at(0)
        .simulate('change', { target: { value: 'notes' } });

      expect(wrapper.find('EuiButtonGroup[idSelected="about"]').exists()).toBeFalsy();
      expect(wrapper.find('EuiButtonGroup[idSelected="notes"]').exists()).toBeTruthy();
    });

    test('it displays notes markdown when user toggles to `notes`', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <StepAboutRuleToggleDetails loading={false} stepData={mockAboutStepRule} />
        </ThemeProvider>
      );

      wrapper
        .find('input[title="Notes"]')
        .at(0)
        .simulate('change', { target: { value: 'notes' } });

      expect(wrapper.find('EuiButtonGroup[idSelected="notes"]').exists()).toBeTruthy();
      expect(wrapper.find('Markdown h1').text()).toEqual('test documentation');
    });
  });
});
