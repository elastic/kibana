/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestBed, SetupFunc } from '../../../../../../test_utils';
import { Template } from '../../../common/types';
import { nextTick } from './index';

export interface TemplateFormTestBed extends TestBed<TemplateFormTestSubjects> {
  actions: {
    clickNextButton: () => void;
    clickBackButton: () => void;
    clickSubmitButton: () => void;
    completeStepOne: ({ name, indexPatterns, order, version }: Partial<Template>) => void;
    completeStepTwo: (settings: string) => void;
    completeStepThree: (mappings: string) => void;
    completeStepFour: (aliases: string) => void;
    selectSummaryTab: (tab: 'summary' | 'request') => void;
  };
}

export const formSetup = async (
  initTestBed: SetupFunc<TestSubjects>
): Promise<TemplateFormTestBed> => {
  const testBed = await initTestBed();

  // User actions
  const clickNextButton = () => {
    testBed.find('nextButton').simulate('click');
  };

  const clickBackButton = () => {
    testBed.find('backButton').simulate('click');
  };

  const clickSubmitButton = () => {
    testBed.find('submitButton').simulate('click');
  };

  const completeStepOne = async ({ name, indexPatterns, order, version }: Partial<Template>) => {
    const { form, find, component } = testBed;

    if (name) {
      form.setInputValue('nameField.input', name);
    }

    if (indexPatterns) {
      const indexPatternsFormatted = indexPatterns.map((pattern: string) => ({
        label: pattern,
        value: pattern,
      }));

      find('mockComboBox').simulate('change', indexPatternsFormatted); // Using mocked EuiComboBox
      await nextTick();
    }

    if (order) {
      form.setInputValue('orderField.input', JSON.stringify(order));
    }

    if (version) {
      form.setInputValue('versionField.input', JSON.stringify(version));
    }

    clickNextButton();
    await nextTick();
    component.update();
  };

  const completeStepTwo = async (settings: string) => {
    const { find, component } = testBed;

    if (settings) {
      find('mockCodeEditor').simulate('change', {
        jsonString: settings,
      }); // Using mocked EuiCodeEditor
      await nextTick();
      component.update();
    }

    clickNextButton();
    await nextTick();
    component.update();
  };

  const completeStepThree = async (mappings: string) => {
    const { find, component } = testBed;

    if (mappings) {
      find('mockCodeEditor').simulate('change', {
        jsonString: mappings,
      }); // Using mocked EuiCodeEditor
      await nextTick(50);
      component.update();
    }

    clickNextButton();
    await nextTick(50); // hooks updates cycles are tricky, adding some latency is needed
    component.update();
  };

  const completeStepFour = async (aliases: string) => {
    const { find, component } = testBed;

    if (aliases) {
      find('mockCodeEditor').simulate('change', {
        jsonString: aliases,
      }); // Using mocked EuiCodeEditor
      await nextTick(50);
      component.update();
    }

    clickNextButton();
    await nextTick(50);
    component.update();
  };

  const selectSummaryTab = (tab: 'summary' | 'request') => {
    const tabs = ['summary', 'request'];

    testBed
      .find('summaryTabContent')
      .find('.euiTab')
      .at(tabs.indexOf(tab))
      .simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickNextButton,
      clickBackButton,
      clickSubmitButton,
      completeStepOne,
      completeStepTwo,
      completeStepThree,
      completeStepFour,
      selectSummaryTab,
    },
  };
};

export type TemplateFormTestSubjects = TestSubjects;

export type TestSubjects =
  | 'backButton'
  | 'codeEditorContainer'
  | 'indexPatternsField'
  | 'indexPatternsWarning'
  | 'indexPatternsWarningDescription'
  | 'mockCodeEditor'
  | 'mockComboBox'
  | 'nameField'
  | 'nameField.input'
  | 'nextButton'
  | 'orderField'
  | 'orderField.input'
  | 'pageTitle'
  | 'requestTab'
  | 'saveTemplateError'
  | 'settingsEditor'
  | 'systemTemplateEditCallout'
  | 'stepAliases'
  | 'stepMappings'
  | 'stepSettings'
  | 'stepSummary'
  | 'stepTitle'
  | 'submitButton'
  | 'summaryTab'
  | 'summaryTabContent'
  | 'templateForm'
  | 'templateFormContainer'
  | 'testingEditor'
  | 'versionField'
  | 'versionField.input';
