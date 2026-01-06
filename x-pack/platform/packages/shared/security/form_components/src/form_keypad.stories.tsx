/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import type { Meta, StoryFn } from '@storybook/react';
import { Form, Formik, useField } from 'formik';
import React from 'react';

import { FormChangesProvider, useFormChanges } from './form_changes';
import { FormLabel } from './form_label';
import { FormRow } from './form_row';

export default {
  title: 'Security/Form Components/KeyPad Menu',
  component: FormRow,
} as Meta;

interface KeyPadFieldProps {
  name: string;
  options: Array<{
    id: string;
    label: string;
    icon: string;
  }>;
}

/**
 * Custom field component that integrates EuiKeyPadMenu with Formik
 */
const KeyPadField: React.FC<KeyPadFieldProps> = ({ name, options }) => {
  const [field, , helpers] = useField(name);

  return (
    <EuiKeyPadMenu>
      {options.map((option) => (
        <EuiKeyPadMenuItem
          key={option.id}
          id={option.id}
          label={option.label}
          isSelected={field.value === option.id}
          onClick={() => helpers.setValue(option.id)}
        >
          <EuiIcon type={option.icon} size="l" />
        </EuiKeyPadMenuItem>
      ))}
    </EuiKeyPadMenu>
  );
};

export const ThemeSelector: StoryFn = () => {
  const formChanges = useFormChanges();

  return (
    <Formik
      initialValues={{
        theme: 'system',
      }}
      onSubmit={(values) => {
        alert('Theme saved: ' + values.theme);
      }}
    >
      <FormChangesProvider value={formChanges}>
        <Form>
          <FormRow label={<FormLabel for="theme">Color mode</FormLabel>}>
            <KeyPadField
              name="theme"
              options={[
                { id: 'system', label: 'System', icon: 'desktop' },
                { id: 'light', label: 'Light', icon: 'sun' },
                { id: 'dark', label: 'Dark', icon: 'moon' },
              ]}
            />
          </FormRow>
          <EuiSpacer size="m" />
          <EuiButton type="submit" fill disabled={formChanges.count === 0}>
            Save theme
          </EuiButton>
        </Form>
      </FormChangesProvider>
    </Formik>
  );
};

export const ThemeSelectorWithBetaBadge: StoryFn = () => {
  const formChanges = useFormChanges();

  return (
    <Formik
      initialValues={{
        contrastMode: 'system',
      }}
      onSubmit={(values) => {
        alert('Contrast mode saved: ' + values.contrastMode);
      }}
    >
      <FormChangesProvider value={formChanges}>
        <Form>
          <FormRow
            label={
              <FormLabel for="contrastMode">
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={1}>Interface contrast</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content="This feature is in beta">
                      <EuiIconTip
                        aria-label="beta"
                        content="This feature is in beta"
                        type="beta"
                        position="bottom"
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </FormLabel>
            }
            fullWidth
          >
            <KeyPadField
              name="contrastMode"
              options={[
                { id: 'system', label: 'System', icon: 'desktop' },
                { id: 'standard', label: 'Normal', icon: 'contrast' },
                { id: 'high', label: 'High', icon: 'contrastHigh' },
              ]}
            />
          </FormRow>

          <EuiSpacer size="m" />
          <EuiButton type="submit" fill disabled={formChanges.count === 0}>
            Save contrast settings
          </EuiButton>
        </Form>
      </FormChangesProvider>
    </Formik>
  );
};
