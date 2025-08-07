/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, fireEvent, waitFor, within } from '@testing-library/react';
import { FailureStoreFormProps, FailureStoreModal } from './failure_store_modal';

const defaultProps = {
  onCloseModal: jest.fn(),
  onSaveModal: jest.fn(),
  failureStoreProps: {
    failureStoreEnabled: false,
    defaultRetentionPeriod: '30d',
  } as FailureStoreFormProps,
};

const renderModal = (failureStoreProps = defaultProps.failureStoreProps) => {
  return render(
    <IntlProvider>
      <FailureStoreModal {...defaultProps} failureStoreProps={failureStoreProps} />
    </IntlProvider>
  );
};

describe('FailureStoreModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with failure store toggle', () => {
    const { getByTestId } = renderModal();

    expect(getByTestId('editFailureStoreModal')).toBeInTheDocument();
    expect(getByTestId('enableFailureStoreToggle')).toBeInTheDocument();
  });

  it('renders form fields when failure store is enabled', () => {
    const { getByTestId } = renderModal({
      failureStoreEnabled: true,
      defaultRetentionPeriod: '30d',
    });

    expect(getByTestId('selectFailureStorePeriodType')).toBeInTheDocument();
    expect(getByTestId('selectFailureStorePeriodValue')).toBeInTheDocument();
    expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toBeInTheDocument();
  });

  it('does not render period fields when failure store is disabled', () => {
    const { queryByTestId } = renderModal();

    expect(queryByTestId('selectFailureStorePeriodType')).not.toBeInTheDocument();
    expect(queryByTestId('selectFailureStorePeriodValue')).not.toBeInTheDocument();
    expect(queryByTestId('selectFailureStoreRetentionPeriodUnit')).not.toBeInTheDocument();
  });

  it('calls onCloseModal when cancel button is clicked', () => {
    const { getByTestId } = renderModal();

    fireEvent.click(getByTestId('cancelButton'));
    expect(defaultProps.onCloseModal).toHaveBeenCalledTimes(1);
  });

  it('renders retention period info text when failure store is enabled', () => {
    const { getByText } = renderModal({
      failureStoreEnabled: true,
      defaultRetentionPeriod: '30d',
    });

    expect(
      getByText(
        'This retention period stores data in the hot tier for best indexing and search performance.'
      )
    ).toBeInTheDocument();
  });
  describe('save modal', () => {
    it('only saves failureStoreEnabled if it is disabled', async () => {
      const { getByTestId, queryByTestId } = renderModal({
        failureStoreEnabled: true,
        defaultRetentionPeriod: '30d',
        customRetentionPeriod: '15d',
      });

      expect(getByTestId('saveButton')).toBeInTheDocument();
      expect(getByTestId('saveButton')).toBeDisabled();
      // Expect the toggle to be on initially
      expect(getByTestId('enableFailureStoreToggle')).toBeChecked();

      expect(getByTestId('selectFailureStorePeriodValue')).toBeInTheDocument();
      expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toBeInTheDocument();

      expect(getByTestId('selectFailureStorePeriodValue')).toHaveValue(15);
      expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toHaveValue('d');

      fireEvent.click(getByTestId('enableFailureStoreToggle'));

      expect(queryByTestId('selectFailureStorePeriodType')).not.toBeInTheDocument();
      expect(queryByTestId('selectFailureStorePeriodValue')).not.toBeInTheDocument();

      expect(getByTestId('saveButton')).not.toBeDisabled();
      // Expect the toggle to be off
      expect(getByTestId('enableFailureStoreToggle')).not.toBeChecked();

      fireEvent.click(getByTestId('saveButton'));

      await waitFor(() => {
        expect(defaultProps.onSaveModal).toHaveBeenCalledTimes(1);
        expect(defaultProps.onSaveModal).toHaveBeenCalledWith({
          failureStoreEnabled: false,
        });
      });
    });

    it('saves custom retention period when specified', async () => {
      const { getByTestId, findByTestId } = renderModal({
        failureStoreEnabled: false,
        defaultRetentionPeriod: '40m',
      });

      fireEvent.click(getByTestId('enableFailureStoreToggle'));

      const customButton = within(getByTestId('selectFailureStorePeriodType')).getByRole('button', {
        name: /custom/i,
      });
      const defaultButton = within(getByTestId('selectFailureStorePeriodType')).getByRole(
        'button',
        {
          name: /default/i,
        }
      );
      const valueSelector = await findByTestId('selectFailureStorePeriodValue');
      const unitSelector = await findByTestId('selectFailureStoreRetentionPeriodUnit');

      expect(customButton).toHaveAttribute('aria-pressed', 'false');
      expect(defaultButton).toHaveAttribute('aria-pressed', 'true');

      expect(valueSelector).toBeInTheDocument();
      expect(unitSelector).toBeInTheDocument();
      expect(valueSelector).toBeDisabled();
      expect(unitSelector).toBeDisabled();

      // The default retention period in the props is 40m, so the value should be 40 and unit 'm'
      expect(valueSelector).toHaveValue(40);
      expect(unitSelector).toHaveValue('m');

      fireEvent.click(customButton);

      expect(customButton).toHaveAttribute('aria-pressed', 'true');
      expect(defaultButton).toHaveAttribute('aria-pressed', 'false');

      expect(valueSelector).not.toBeDisabled();
      expect(unitSelector).not.toBeDisabled();

      // The custom retention period by default is the default period, so the value should be 40 and unit 'm'
      expect(valueSelector).toHaveValue(40);
      expect(unitSelector).toHaveValue('m');

      fireEvent.change(unitSelector, {
        target: { value: 's' },
      });
      fireEvent.change(valueSelector, { target: { value: '15' } });

      expect(unitSelector).toHaveValue('s');
      expect(valueSelector).toHaveValue(15);

      fireEvent.click(getByTestId('saveButton'));

      await waitFor(() => {
        expect(defaultProps.onSaveModal).toHaveBeenCalledWith({
          failureStoreEnabled: true,
          customRetentionPeriod: '15s',
        });
      });
    });
  });
});
