/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { NeedTierUpgrade, type NeedTierUpgradeProps } from './need_tier_upgrade';
import { translations } from './need_tier_upgrade.translations';
import { translations as defaultTranslations } from '../call_to_action.translations';
import { EuiThemeProvider } from '@elastic/eui';

describe('NeedTierUpgrade', () => {
  const onManageSubscription = jest.fn();

  const renderComponent = (props: NeedTierUpgradeProps) =>
    render(<NeedTierUpgrade {...props} />, { wrapper: EuiThemeProvider });

  it('renders the component with the correct title and description', () => {
    renderComponent({ onManageSubscription });

    expect(screen.queryByText(translations.cardTitle)).toBeInTheDocument();
    expect(screen.queryByText(translations.cardDescription)).toBeInTheDocument();
    expect(screen.queryByText(defaultTranslations.titleUnlock)).toBeInTheDocument();
    expect(screen.queryByText(translations.description)).toBeInTheDocument();
  });

  it('renders the button with the correct text', () => {
    renderComponent({ onManageSubscription });

    expect(screen.queryByText(translations.buttonLabel)).toBeInTheDocument();
  });

  it('calls onManageSubscription when the button is clicked', () => {
    const { getByText } = renderComponent({ onManageSubscription });

    fireEvent.click(getByText(translations.buttonLabel));
    expect(onManageSubscription).toHaveBeenCalled();
  });
});
