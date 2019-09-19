/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestBed } from '../../../../../../test_utils';
import { Template } from '../../../common/types';

export interface TemplateFormTestBed extends TestBed<TemplateFormTestSubjects> {
  actions: {
    clickNextButton: () => void;
    clickBackButton: () => void;
    clickSubmitButton: () => void;
    completeStepOne: ({ name, indexPatterns, order, version }: Partial<Template>) => void;
    completeStepTwo: ({ settings }: Partial<Template>) => void;
    completeStepThree: ({ mappings }: Partial<Template>) => void;
    completeStepFour: ({ aliases }: Partial<Template>) => void;
    selectSummaryTab: (tab: 'summary' | 'request') => void;
  };
}

export const formSetup = async (initTestBed: any): Promise<TemplateFormTestBed> => {
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

  const completeStepOne = ({ name, indexPatterns, order, version }: Partial<Template>) => {
    const { form, find } = testBed;

    if (name) {
      form.setInputValue('nameInput', name);
    }

    if (indexPatterns) {
      const indexPatternsFormatted = indexPatterns.map((pattern: string) => ({
        label: pattern,
        value: pattern,
      }));

      find('mockComboBox').simulate('change', indexPatternsFormatted); // Using mocked EuiComboBox
    }

    if (order) {
      form.setInputValue('orderInput', JSON.stringify(order));
    }

    if (version) {
      form.setInputValue('versionInput', JSON.stringify(version));
    }

    clickNextButton();
  };

  const completeStepTwo = ({ settings }: Partial<Template>) => {
    const { find } = testBed;

    if (settings) {
      find('mockCodeEditor').simulate('change', {
        jsonString: settings,
      }); // Using mocked EuiCodeEditor
    }

    clickNextButton();
  };

  const completeStepThree = ({ mappings }: Partial<Template>) => {
    const { find } = testBed;

    if (mappings) {
      find('mockCodeEditor').simulate('change', {
        jsonString: mappings,
      }); // Using mocked EuiCodeEditor
    }

    clickNextButton();
  };

  const completeStepFour = ({ aliases }: Partial<Template>) => {
    const { find } = testBed;

    if (aliases) {
      find('mockCodeEditor').simulate('change', {
        jsonString: aliases,
      }); // Using mocked EuiCodeEditor
    }

    clickNextButton();
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

type TestSubjects =
  | 'backButton'
  | 'codeEditorContainer'
  | 'indexPatternsComboBox'
  | 'indexPatternsWarning'
  | 'indexPatternsWarningDescription'
  | 'mockCodeEditor'
  | 'mockComboBox'
  | 'nameInput'
  | 'nextButton'
  | 'orderInput'
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
  | 'versionInput';
