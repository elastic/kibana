/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { useForm, FormProvider, useWatch } from 'react-hook-form';

import { PlatformCheckBoxGroupField } from './platform_checkbox_group_field';

const PlatformValueProbe: React.FC = () => {
  const value = useWatch({ name: 'platform' });

  return <div data-test-subj="platform-value">{value ?? ''}</div>;
};

const FormWrapper: React.FC<{
  children: React.ReactNode;
  defaultValues?: Record<string, unknown>;
}> = ({ children, defaultValues }) => {
  const methods = useForm({ defaultValues: { platform: '', ...defaultValues } });

  return (
    <EuiProvider>
      <IntlProvider locale="en">
        <FormProvider {...methods}>
          {children}
          <PlatformValueProbe />
        </FormProvider>
      </IntlProvider>
    </EuiProvider>
  );
};

const getSelectedPillLabels = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-test-subj="osquery-platform-checkbox-group"] .euiComboBoxPill'
    )
  ).map((el) => el.textContent?.trim() ?? '');

describe('PlatformCheckBoxGroupField', () => {
  describe('default state (empty value)', () => {
    it('renders an empty combobox when value is an empty string', () => {
      render(
        <FormWrapper>
          <PlatformCheckBoxGroupField />
        </FormWrapper>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(getSelectedPillLabels()).toEqual([]);
    });

    it('does not crash when value is seeded as an empty array', () => {
      render(
        <FormWrapper defaultValues={{ platform: [] }}>
          <PlatformCheckBoxGroupField />
        </FormWrapper>
      );

      expect(getSelectedPillLabels()).toEqual([]);
    });

    it('does not render a clear-all (X) button', () => {
      render(
        <FormWrapper defaultValues={{ platform: 'linux,darwin' }}>
          <PlatformCheckBoxGroupField />
        </FormWrapper>
      );

      expect(screen.queryByLabelText('Clear input')).not.toBeInTheDocument();
    });
  });

  describe('with preset values', () => {
    it('should show only Linux and macOS pills when platform is "linux,darwin"', () => {
      render(
        <FormWrapper defaultValues={{ platform: 'linux,darwin' }}>
          <PlatformCheckBoxGroupField />
        </FormWrapper>
      );

      expect(getSelectedPillLabels()).toEqual(['Linux', 'macOS']);
    });

    it('should show only the Windows pill when platform is "windows"', () => {
      render(
        <FormWrapper defaultValues={{ platform: 'windows' }}>
          <PlatformCheckBoxGroupField />
        </FormWrapper>
      );

      expect(getSelectedPillLabels()).toEqual(['Windows']);
    });
  });

  describe('user interaction', () => {
    it('drops the OS id from the form value when its pill close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FormWrapper defaultValues={{ platform: 'linux,darwin,windows' }}>
          <PlatformCheckBoxGroupField />
        </FormWrapper>
      );

      const linuxRemoveButton = screen.getByLabelText('Remove Linux from selection in this group');
      await user.click(linuxRemoveButton);

      expect(getSelectedPillLabels()).toEqual(['macOS', 'Windows']);
      expect(screen.getByTestId('platform-value')).toHaveTextContent(/^darwin,windows$/);
    });

    it('removing the last pill leaves the field empty (no auto-fill)', async () => {
      const user = userEvent.setup();
      render(
        <FormWrapper defaultValues={{ platform: 'linux' }}>
          <PlatformCheckBoxGroupField />
        </FormWrapper>
      );

      const linuxRemoveButton = screen.getByLabelText('Remove Linux from selection in this group');
      await user.click(linuxRemoveButton);

      expect(getSelectedPillLabels()).toEqual([]);
      expect(screen.getByTestId('platform-value')).toHaveTextContent('');
    });
  });

  describe('disabled state', () => {
    it('renders a non-interactive combobox when isDisabled is true', () => {
      render(
        <FormWrapper>
          <PlatformCheckBoxGroupField euiFieldProps={{ isDisabled: true }} />
        </FormWrapper>
      );

      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });
});
