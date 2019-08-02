/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBed, TestBedConfig } from '../../../../../../test_utils';
import { BASE_PATH } from '../../../common/constants';
import { TemplatesCreate } from '../../../public/sections/templates_create';
import { Template } from '../../../common/types';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}templates_create`],
    componentRoutePath: `${BASE_PATH}templates_create`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(TemplatesCreate, testBedConfig);

export interface TemplatesCreateTestBed extends TestBed<TemplatesCreateTestSubjects> {
  actions: {
    clickNextButton: () => void;
    clickBackButton: () => void;
    clickSubmitButton: () => void;
    completeStepOne: ({ name, indexPatterns, order, version }: Partial<Template>) => void;
    completeStepTwo: ({ settings }: Partial<Template>) => void;
    completeStepThree: () => void;
    completeStepFour: ({ aliases }: Partial<Template>) => void;
    selectSummaryTab: (tab: 'summary' | 'json') => void;
  };
}

export const setup = async (): Promise<TemplatesCreateTestBed> => {
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
      form.setInputValue('orderInput', order);
    }

    if (version) {
      form.setInputValue('versionInput', version);
    }

    clickNextButton();
  };

  const completeStepTwo = ({ settings }: Partial<Template>) => {
    const { find, exists } = testBed;

    expect(exists('stepSettings')).toBe(true);
    expect(find('stepTitle').text()).toEqual('Index settings (optional)');

    if (settings) {
      find('mockCodeEditor').simulate('change', {
        jsonString: settings,
      }); // Using mocked EuiCodeEditor
    }

    clickNextButton();
  };

  // For now, leave mappings value empty and proceed to next step
  // Consider changing once mappings editor plugin is feature complete
  const completeStepThree = () => {
    const { find, exists } = testBed;

    expect(exists('stepMappings')).toBe(true);
    expect(find('stepTitle').text()).toEqual('Mappings (optional)');

    clickNextButton();
  };

  const completeStepFour = ({ aliases }: Partial<Template>) => {
    const { find, exists } = testBed;

    expect(exists('stepAliases')).toBe(true);
    expect(find('stepTitle').text()).toEqual('Aliases (optional)');

    if (aliases) {
      find('mockCodeEditor').simulate('change', {
        jsonString: aliases,
      }); // Using mocked EuiCodeEditor
    }

    clickNextButton();
  };

  const selectSummaryTab = (tab: 'summary' | 'json') => {
    const tabs = ['summary', 'json'];

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

export type TemplatesCreateTestSubjects = TestSubjects;

type TestSubjects =
  | 'backButton'
  | 'codeEditorContainer'
  | 'indexPatternsComboBox'
  | 'jsonTab'
  | 'indexPatternsWarning'
  | 'indexPatternsWarningDescription'
  | 'mockCodeEditor'
  | 'mockComboBox'
  | 'nameInput'
  | 'nextButton'
  | 'orderInput'
  | 'pageTitle'
  | 'saveTemplateError'
  | 'settingsEditor'
  | 'stepAliases'
  | 'stepMappings'
  | 'stepSettings'
  | 'stepSummary'
  | 'stepTitle'
  | 'submitButton'
  | 'summaryTab'
  | 'summaryTabContent'
  | 'testingEditor'
  | 'versionInput';
