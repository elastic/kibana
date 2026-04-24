/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { useForm, FormProvider } from 'react-hook-form';

import { PlatformCheckBoxGroupField } from './platform_checkbox_group_field';

jest.mock('./platforms/platform_icon', () => ({
  PlatformIcon: ({ platform }: { platform: string }) => (
    <span data-test-subj={`icon-${platform}`} />
  ),
}));

const FormWrapper: React.FC<{
  children: React.ReactNode;
  defaultValues?: Record<string, unknown>;
}> = ({ children, defaultValues }) => {
  const methods = useForm({ defaultValues: { platform: '', ...defaultValues } });

  return (
    <EuiProvider>
      <IntlProvider locale="en">
        <FormProvider {...methods}>{children}</FormProvider>
      </IntlProvider>
    </EuiProvider>
  );
};

describe('PlatformCheckBoxGroupField', () => {
  describe('default state', () => {
    it('should render all three platform checkboxes', () => {
      render(
        <FormWrapper>
          <PlatformCheckBoxGroupField />
        </FormWrapper>
      );

      expect(screen.getByText('Linux')).toBeInTheDocument();
      expect(screen.getByText('macOS')).toBeInTheDocument();
      expect(screen.getByText('Windows')).toBeInTheDocument();
    });

    it('should check all platforms when no value is provided', () => {
      render(
        <FormWrapper>
          <PlatformCheckBoxGroupField />
        </FormWrapper>
      );

      expect(screen.getByRole('checkbox', { name: /linux/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /macos/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /windows/i })).toBeChecked();
    });
  });

  describe('with preset values', () => {
    it('should check only linux and darwin when platform is "linux,darwin"', () => {
      render(
        <FormWrapper defaultValues={{ platform: 'linux,darwin' }}>
          <PlatformCheckBoxGroupField />
        </FormWrapper>
      );

      expect(screen.getByRole('checkbox', { name: /linux/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /macos/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /windows/i })).not.toBeChecked();
    });

    it('should check only windows when platform is "windows"', () => {
      render(
        <FormWrapper defaultValues={{ platform: 'windows' }}>
          <PlatformCheckBoxGroupField />
        </FormWrapper>
      );

      expect(screen.getByRole('checkbox', { name: /linux/i })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: /macos/i })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: /windows/i })).toBeChecked();
    });
  });

  describe('user interaction', () => {
    it('should toggle checkbox state on click', () => {
      render(
        <FormWrapper>
          <PlatformCheckBoxGroupField />
        </FormWrapper>
      );

      const windowsCheckbox = screen.getByRole('checkbox', { name: /windows/i });
      expect(windowsCheckbox).toBeChecked();

      fireEvent.click(windowsCheckbox);
      expect(windowsCheckbox).not.toBeChecked();

      fireEvent.click(windowsCheckbox);
      expect(windowsCheckbox).toBeChecked();
    });
  });

  describe('disabled state', () => {
    it('should disable checkboxes when isDisabled is true', () => {
      render(
        <FormWrapper>
          <PlatformCheckBoxGroupField euiFieldProps={{ isDisabled: true }} />
        </FormWrapper>
      );

      expect(screen.getByRole('checkbox', { name: /linux/i })).toBeDisabled();
      expect(screen.getByRole('checkbox', { name: /macos/i })).toBeDisabled();
      expect(screen.getByRole('checkbox', { name: /windows/i })).toBeDisabled();
    });
  });
});
