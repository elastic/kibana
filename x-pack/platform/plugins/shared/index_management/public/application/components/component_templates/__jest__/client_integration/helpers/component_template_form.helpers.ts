/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { TestBed } from '@kbn/test-jest-helpers';
import { DataRetention } from '../../../../../../../common';

interface MappingField {
  name: string;
  type: string;
}

export const getFormActions = (testBed: TestBed) => {
  // User actions
  const toggleVersionSwitch = () => {
    testBed.form.toggleEuiSwitch('versionToggle');
  };

  const toggleMetaSwitch = () => {
    testBed.form.toggleEuiSwitch('metaToggle');
  };

  const clickNextButton = () => {
    testBed.find('nextButton').simulate('click');
  };

  const clickBackButton = () => {
    testBed.find('backButton').simulate('click');
  };

  const clickSubmitButton = () => {
    testBed.find('submitButton').simulate('click');
  };

  const setMetaField = (jsonString: string) => {
    testBed.find('mockCodeEditor').simulate('change', {
      jsonString,
    });
  };

  const selectReviewTab = (tab: 'summary' | 'request') => {
    const tabs = ['summary', 'request'];

    testBed
      .find('stepReview.content')
      .find('button.euiTab')
      .at(tabs.indexOf(tab))
      .simulate('click');
  };

  const completeStepLogistics = async ({
    name,
    lifecycle,
  }: {
    name: string;
    lifecycle: DataRetention;
  }) => {
    const { form, component } = testBed;
    // Add name field
    form.setInputValue('nameField.input', name);

    if (lifecycle && lifecycle.enabled) {
      act(() => {
        form.toggleEuiSwitch('dataRetentionToggle.input');
      });
      component.update();

      act(() => {
        form.setInputValue('valueDataRetentionField', String(lifecycle.value));
      });
    }

    await act(async () => {
      clickNextButton();
    });

    component.update();
  };

  const completeStepSettings = async (settings?: { [key: string]: any }) => {
    const { find, component } = testBed;
    const settingsValue = JSON.stringify(settings);

    if (settingsValue) {
      find('settingsEditor').getDOMNode().setAttribute('data-currentvalue', settingsValue);
      find('settingsEditor').simulate('change');
    }

    await act(async () => {
      clickNextButton();
    });

    component.update();
  };

  const addMappingField = async (name: string, type: string) => {
    const { find, form, component } = testBed;

    await act(async () => {
      form.setInputValue('nameParameterInput', name);
      find('createFieldForm.mockComboBox').simulate('change', [
        {
          label: type,
          value: type,
        },
      ]);
    });

    await act(async () => {
      find('createFieldForm.addButton').simulate('click');
    });

    component.update();
  };

  const completeStepMappings = async (mappingFields?: MappingField[]) => {
    const { component } = testBed;

    if (mappingFields) {
      for (const field of mappingFields) {
        const { name, type } = field;
        await addMappingField(name, type);
      }
    }

    await act(async () => {
      clickNextButton();
    });

    component.update();
  };

  const completeStepAliases = async (aliases?: { [key: string]: any }) => {
    const { find, component } = testBed;
    const aliasesValue = JSON.stringify(aliases);

    if (aliasesValue) {
      find('aliasesEditor').getDOMNode().setAttribute('data-currentvalue', aliasesValue);
      find('aliasesEditor').simulate('change');
    }

    await act(async () => {
      clickNextButton();
    });

    component.update();
  };

  return {
    toggleVersionSwitch,
    toggleMetaSwitch,
    clickNextButton,
    clickBackButton,
    clickSubmitButton,
    setMetaField,
    selectReviewTab,
    completeStepSettings,
    completeStepAliases,
    completeStepLogistics,
    completeStepMappings,
  };
};

export type ComponentTemplateFormTestSubjects =
  | 'backButton'
  | 'documentationLink'
  | 'metaToggle'
  | 'metaEditor'
  | 'mockCodeEditor'
  | 'nameField.input'
  | 'nextButton'
  | 'pageTitle'
  | 'saveComponentTemplateError'
  | 'submitButton'
  | 'stepReview'
  | 'stepReview.title'
  | 'stepReview.content'
  | 'stepReview.summaryTab'
  | 'stepReview.requestTab'
  | 'valueDataRetentionField'
  | 'deprecatedTemplateCallout'
  | 'dataRetentionToggle.input'
  | 'versionField'
  | 'aliasesEditor'
  | 'mappingsEditor'
  | 'settingsEditor'
  | 'affectedMappingsList'
  | 'versionField.input';
