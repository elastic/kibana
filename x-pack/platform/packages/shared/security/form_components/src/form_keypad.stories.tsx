/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import type { Meta, StoryFn } from '@storybook/react';
import { Form, Formik } from 'formik';
import React from 'react';

import { ContrastKeyPadMenu } from './contrast_keypad_menu';
import { FormChangesProvider, useFormChanges } from './form_changes';
import { FormRow } from './form_row';
import { ThemeKeyPadMenu } from './theme_keypad_menu';

export default {
  title: 'Security/Form Components/KeyPad Menu',
  component: FormRow,
} as Meta;

export const ThemeAndContrastSelectors: StoryFn = () => {
  const formChanges = useFormChanges();

  return (
    <Formik
      initialValues={{
        theme: 'system',
        contrastMode: 'system',
      }}
      onSubmit={(values) => {
        alert('Settings saved: ' + JSON.stringify(values, null, 2));
      }}
    >
      <FormChangesProvider value={formChanges}>
        <Form>
          <FormRow name="theme" fullWidth>
            <ThemeKeyPadMenu name="theme" />
          </FormRow>
          <EuiSpacer size="l" />
          <FormRow name="contrastMode" fullWidth>
            <ContrastKeyPadMenu name="contrastMode" />
          </FormRow>
          <EuiSpacer size="m" />
          <EuiButton type="submit" fill disabled={formChanges.count === 0}>
            Save appearance settings
          </EuiButton>
        </Form>
      </FormChangesProvider>
    </Formik>
  );
};
