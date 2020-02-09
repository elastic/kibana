/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestBed, SetupFunc, UnwrapPromise } from '../../../../../../test_utils';
import { Template } from '../../../common/types';
import { nextTick } from './index';

interface MappingField {
  name: string;
  type: string;
}

// Look at the return type of formSetup and form a union between that type and the TestBed type.
// This way we an define the formSetup return object and use that to dynamically define our type.
export type TemplateFormTestBed = TestBed<TemplateFormTestSubjects> &
  UnwrapPromise<ReturnType<typeof formSetup>>;

export const formSetup = async (initTestBed: SetupFunc<TestSubjects>) => {
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

  const clickEditButtonAtField = (index: number) => {
    testBed
      .find('editFieldButton')
      .at(index)
      .simulate('click');
  };

  const clickEditFieldUpdateButton = () => {
    testBed.find('editFieldUpdateButton').simulate('click');
  };

  const clickRemoveButtonAtField = (index: number) => {
    testBed
      .find('removeFieldButton')
      .at(index)
      .simulate('click');

    testBed.find('confirmModalConfirmButton').simulate('click');
  };

  const clickCancelCreateFieldButton = () => {
    testBed.find('createFieldWrapper.cancelButton').simulate('click');
  };

  const completeStepOne = async ({
    name,
    indexPatterns,
    order,
    version,
  }: Partial<Template> = {}) => {
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

  const completeStepTwo = async (settings?: string) => {
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

  const completeStepThree = async (mappingFields?: MappingField[]) => {
    const { component } = testBed;

    if (mappingFields) {
      for (const field of mappingFields) {
        const { name, type } = field;
        await addMappingField(name, type);
      }
    } else {
      await nextTick();
    }

    clickNextButton();
    await nextTick(50); // hooks updates cycles are tricky, adding some latency is needed
    component.update();
  };

  const completeStepFour = async (aliases?: string) => {
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

  const addMappingField = async (name: string, type: string) => {
    const { find, form, component } = testBed;

    form.setInputValue('nameParameterInput', name);
    find('createFieldWrapper.mockComboBox').simulate('change', [
      {
        label: type,
        value: type,
      },
    ]);

    await nextTick(50);
    component.update();

    find('createFieldWrapper.addButton').simulate('click');

    await nextTick();
    component.update();
  };

  return {
    ...testBed,
    actions: {
      clickNextButton,
      clickBackButton,
      clickSubmitButton,
      clickEditButtonAtField,
      clickEditFieldUpdateButton,
      clickRemoveButtonAtField,
      clickCancelCreateFieldButton,
      completeStepOne,
      completeStepTwo,
      completeStepThree,
      completeStepFour,
      selectSummaryTab,
      addMappingField,
    },
  };
};

export type TemplateFormTestSubjects = TestSubjects;

export type TestSubjects =
  | 'backButton'
  | 'codeEditorContainer'
  | 'confirmModalConfirmButton'
  | 'createFieldWrapper.addPropertyButton'
  | 'createFieldWrapper.addButton'
  | 'createFieldWrapper.addFieldButton'
  | 'createFieldWrapper.addMultiFieldButton'
  | 'createFieldWrapper.cancelButton'
  | 'createFieldWrapper.mockComboBox'
  | 'editFieldButton'
  | 'editFieldUpdateButton'
  | 'fieldsListItem'
  | 'fieldTypeComboBox'
  | 'indexPatternsField'
  | 'indexPatternsWarning'
  | 'indexPatternsWarningDescription'
  | 'mappingsEditorFieldEdit'
  | 'mockCodeEditor'
  | 'mockComboBox'
  | 'nameField'
  | 'nameField.input'
  | 'nameParameterInput'
  | 'nextButton'
  | 'orderField'
  | 'orderField.input'
  | 'pageTitle'
  | 'removeFieldButton'
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
