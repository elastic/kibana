/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';

import React, { FC } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import { stringValidator } from '../validators/string_validator';
import { createFormField } from '../form_field';
import { createFormSection } from '../form_section';
import { createFormSlice } from '../form_slice';
import { useUpdatedConfig } from '../use_updated_config';

import { FormSectionToggle } from './form_section_toggle';
import { FormTextInput } from './form_text_input';

const defaultConfig = { basic: 'basic value', advanced: { setting: 'advanced setting value' } };

// Sets up form state including a section and a form field within it
// to demonstrate how dependencies between sections and fields are maintained
// when getting the updated config object.
const formSlice = createFormSlice(
  'test',
  [
    createFormField('basic', 'basic', defaultConfig),
    createFormField('advancedSetting', 'advanced.setting', defaultConfig, {
      section: 'advanced',
      isOptional: true,
      isOptionalInSection: false,
    }),
  ],
  [createFormSection('advanced', 'advanced', defaultConfig)],
  {
    stringValidator,
  }
);

const reduxStore = configureStore({
  reducer: { test: formSlice.reducer },
});

const RenderConfig: FC = () => {
  const updatedConfig = useUpdatedConfig(formSlice, defaultConfig);
  return <div data-test-subj="renderConfig">{JSON.stringify(updatedConfig)}</div>;
};

describe('FormSectionToggle', () => {
  it('should update the config after input update', () => {
    render(
      <Provider store={reduxStore}>
        <FormTextInput slice={formSlice} field="basic" label="Basic" />
        <FormSectionToggle slice={formSlice} section="advanced" label="The advanced section">
          <FormTextInput slice={formSlice} field="advancedSetting" label="The advanced setting" />
        </FormSectionToggle>
        <RenderConfig />
      </Provider>
    );

    const basicInputEl = screen.getByTestId('testBasicInput');
    expect(basicInputEl).toBeInTheDocument();

    const advancedSettingInputEl = screen.getByTestId('testAdvancedSettingInput');
    expect(advancedSettingInputEl).toBeInTheDocument();

    const advancedSectionSwitchEl = screen.getByTestId('testAdvancedSwitch');
    expect(advancedSectionSwitchEl).toBeInTheDocument();

    // Form hasn't been touched yet so should not retrieve any updated entries.
    expect(screen.getByTestId('renderConfig')).toHaveTextContent('{}');

    fireEvent.change(basicInputEl, { target: { value: 'updated basic value' } });

    // Just the basic value has been updated and should be part of the updated config.
    expect(screen.getByTestId('renderConfig')).toHaveTextContent('{"basic":"updated basic value"}');

    fireEvent.change(advancedSettingInputEl, {
      target: { value: 'updated advanced setting value' },
    });

    // Now both entries were updated and should be part of the update object.
    expect(screen.getByTestId('renderConfig')).toHaveTextContent(
      '{"basic":"updated basic value","advanced":{"setting":"updated advanced setting value"}}'
    );

    fireEvent.click(advancedSectionSwitchEl);

    // Disabling the whole section should hide the form element within the section
    // as well as return `null` for the section to indicate that it's been disabled.
    // A use case for this is the API to update a transform, for example when a
    // transform config initially had a config for a retention policy but with the
    // update it got disabled.
    expect(advancedSettingInputEl).not.toBeInTheDocument();
    expect(screen.getByTestId('renderConfig')).toHaveTextContent(
      '{"basic":"updated basic value","advanced":null}'
    );
  });
});
