/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { RemovableConnectorCard, SelectableConnectorCard } from './connector_card';

const renderCard = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const defaultLabel = {
  icon: <span data-test-subj="connectorCardIcon" />,
  name: 'Google Drive',
  typeLabel: 'Google Drive connector',
};

describe('SelectableConnectorCard', () => {
  it('calls onChange with true when unchecked and the card is clicked', () => {
    const onChange = jest.fn();
    renderCard(
      <SelectableConnectorCard
        id="connector-card-1"
        {...defaultLabel}
        isChecked={false}
        onChange={onChange}
        data-test-subj="testSelectableConnectorCard"
      />
    );

    fireEvent.click(screen.getByTestId('testSelectableConnectorCard'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when checked and the card is clicked', () => {
    const onChange = jest.fn();
    renderCard(
      <SelectableConnectorCard
        id="connector-card-2"
        {...defaultLabel}
        isChecked
        onChange={onChange}
        data-test-subj="testSelectableConnectorCard"
      />
    );

    fireEvent.click(screen.getByTestId('testSelectableConnectorCard'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderCard(
      <SelectableConnectorCard
        id="connector-card-3"
        {...defaultLabel}
        isChecked={false}
        isDisabled
        onChange={onChange}
        data-test-subj="testSelectableConnectorCard"
      />
    );

    const checkbox = screen.getByTestId('testSelectableConnectorCard');
    expect(checkbox).toBeDisabled();
    await user.click(checkbox);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('RemovableConnectorCard', () => {
  it('renders the name, type label, and action slot', () => {
    renderCard(
      <RemovableConnectorCard
        {...defaultLabel}
        action={<button type="button" data-test-subj="testRemoveAction" />}
        data-test-subj="testRemovableConnectorCard"
      />
    );

    const card = screen.getByTestId('testRemovableConnectorCard');
    expect(card).toHaveTextContent('Google Drive');
    expect(card).toHaveTextContent('Google Drive connector');
    expect(screen.getByTestId('testRemoveAction')).toBeInTheDocument();
    expect(screen.getByTestId('connectorCardIcon')).toBeInTheDocument();
  });
});
