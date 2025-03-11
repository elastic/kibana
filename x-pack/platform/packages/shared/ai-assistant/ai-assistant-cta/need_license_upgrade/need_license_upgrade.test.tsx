/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { NeedLicenseUpgrade, NeedLicenseUpgradeProps } from './need_license_upgrade';
import { translations } from './need_license_upgrade.translations';
import { translations as defaultTranslations } from '../call_to_action.translations';
import { EuiThemeProvider } from '@elastic/eui';

describe('NeedLicenseUpgrade', () => {
  const onManageLicense = jest.fn();

  const renderComponent = (props: NeedLicenseUpgradeProps) =>
    render(<NeedLicenseUpgrade {...props} />, { wrapper: EuiThemeProvider });

  it('renders the component with the correct title and description', () => {
    const { getByText } = renderComponent({ onManageLicense });
    expect(getByText(defaultTranslations.titleUnlock)).toBeDefined();
    expect(getByText(translations.description)).toBeDefined();
  });

  it('renders the button with the correct text', () => {
    const { getByText } = renderComponent({ onManageLicense });

    expect(getByText(translations.buttonLabel)).toBeDefined();
  });

  it('calls onManageSubscription when the button is clicked', () => {
    const { getByText } = renderComponent({ onManageLicense });

    fireEvent.click(getByText(translations.buttonLabel));
    expect(onManageLicense).toHaveBeenCalled();
  });
});
