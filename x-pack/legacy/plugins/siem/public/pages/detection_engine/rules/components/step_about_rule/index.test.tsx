/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount, shallow } from 'enzyme';

import { StepAboutRule } from './';
import { mockAboutStepRule } from '../../all/__mocks__/mock';
import { StepRuleDescription } from '../description_step';
import { stepAboutDefaultValue } from './default_value';

jest.mock('react', () => {
  const r = jest.requireActual('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...r, memo: (x: any) => x };
});

describe('StepAboutRuleComponent', () => {
  test('it renders StepRuleDescription if isReadOnlyView is true and `name` property exists', () => {
    // see mockAboutStepRule for name property
    // Note: is the name check for old rules? It's required so no rules should ever not include it
    const wrapper = shallow(
      <StepAboutRule
        addPadding={false}
        defaultValues={mockAboutStepRule}
        descriptionDirection="row"
        isReadOnlyView={true}
        isLoading={false}
      />
    );

    expect(wrapper.find(StepRuleDescription).exists()).toBeTruthy();
  });

  test('renders inputs disabled initially when isReadOnly is false and isLoading is true', () => {
    const wrapper = mount(
      <StepAboutRule
        addPadding={true}
        defaultValues={stepAboutDefaultValue}
        descriptionDirection="row"
        isReadOnlyView={false}
        isLoading={true}
        setForm={jest.fn()}
        setStepData={jest.fn()}
      />
    );

    const nameInput = wrapper.find('input[aria-describedby="detectionEngineStepAboutRuleName"]');
    expect(nameInput.exists()).toBeTruthy();
    expect(nameInput.get(0).props.disabled).toBeTruthy();

    const descriptionInput = wrapper.find(
      'textarea[aria-describedby="detectionEngineStepAboutRuleDescription"]'
    );
    expect(descriptionInput.exists()).toBeTruthy();
    expect(descriptionInput.get(0).props.disabled).toBeTruthy();

    const severityInput = wrapper.find(
      'EuiSuperSelectControl[aria-describedby="detectionEngineStepAboutRuleSeverity"]'
    );
    expect(severityInput.exists()).toBeTruthy();
    expect(severityInput.get(0).props.disabled).toBeTruthy();

    const riskScoreInput = wrapper.find(
      'EuiRange[aria-describedby="detectionEngineStepAboutRuleRiskScore"]'
    );
    expect(riskScoreInput.exists()).toBeTruthy();
    expect(riskScoreInput.get(0).props.disabled).toBeTruthy();

    const tagsInput = wrapper.find('EuiComboBox input'); // TODO find better way to do this
    expect(tagsInput.exists()).toBeTruthy();
    expect(tagsInput.get(0).props.disabled).toBeTruthy();

    const timelineInput = wrapper.find(
      'SearchTimelineSuperSelectComponent[aria-describedby="detectionEngineStepAboutRuleTimeline"]'
    );
    expect(timelineInput.exists()).toBeTruthy();
    expect(timelineInput.get(0).props.isDisabled).toBeTruthy();

    const referenceUrlsInput = wrapper.find(
      'EuiFormRow[data-test-subj="detectionEngineStepAboutRuleReferenceUrls"] input'
    );
    expect(referenceUrlsInput.exists()).toBeTruthy();
    expect(referenceUrlsInput.get(0).props.disabled).toBeTruthy();

    const falsePositivesInput = wrapper.find(
      'EuiFormRow[data-test-subj="detectionEngineStepAboutRuleFalsePositives"] input'
    );
    expect(falsePositivesInput.exists()).toBeTruthy();
    expect(falsePositivesInput.get(0).props.disabled).toBeTruthy();

    const documentationInput = wrapper.find(
      'NewNote[aria-describedby="detectionEngineStepAboutRuleDocumentation"] textarea'
    );
    expect(documentationInput.exists()).toBeTruthy();
    expect(documentationInput.get(0).props.disabled).toBeTruthy();
  });

  test('it prevents user from clicking into other steps if no name defined', () => {
    // test clicking other step headers
    // test clicking continue
    // test that error messages show about required field
  });

  test('it prevents user from clicking into other steps if no description defined', () => {
    // test clicking other step headers
    // test clicking continue
    // test that error messages show about required field
  });

  describe('advanced settings', () => {
    test('it renders advanced settings collapsed initially', () => {});

    test('it expands to show advanced fields', () => {});
  });

  describe('submission', () => {});
});
