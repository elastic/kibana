/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { ConvertToLookupIndexModal } from './convert_to_lookup_index_modal';

const defaultProps = {
  onCloseModal: jest.fn(),
  onConvert: jest.fn(),
  sourceIndexName: 'my-index',
};

const renderModal = () => {
  return render(
    <IntlProvider>
      <ConvertToLookupIndexModal {...defaultProps} />
    </IntlProvider>
  );
};

describe('ConvertToLookupIndexModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal correctly and populate it with default values', () => {
    const { getByTestId } = renderModal();

    // Check if the modal is rendered
    expect(getByTestId('convertToLookupIndexModal')).toBeInTheDocument();

    // Check if the source index name is populated
    expect(getByTestId('sourceIndexName')).toHaveValue('my-index');

    // Check if the lookup index name is populated
    expect(getByTestId('lookupIndexName')).toHaveValue('lookup-my-index');
  });

  it('should display an error and disable the convert button when the lookup index name input is empty', async () => {
    const { getByTestId, findByText } = renderModal();

    // Clear the lookup index name input
    fireEvent.change(getByTestId('lookupIndexName'), { target: { value: '' } });

    // Check for error message
    expect(await findByText('Lookup index name is required')).toBeInTheDocument();

    // Check if the convert button is disabled
    expect(getByTestId('convertButton')).toBeDisabled();
  });

  it('should enable the convert button when lookup index name', () => {
    const { getByTestId } = renderModal();

    // Clear the lookup index name input
    fireEvent.change(getByTestId('lookupIndexName'), { target: { value: '' } });

    // Check if the convert button is disabled
    expect(getByTestId('convertButton')).toBeDisabled();

    // Provide lookup index name
    fireEvent.change(getByTestId('lookupIndexName'), { target: { value: 'lookup-my-index' } });

    // Check if the convert button is disabled
    expect(getByTestId('convertButton')).toBeEnabled();
  });

  it('should call onCloseModal when the cancel button is clicked', () => {
    const { getByTestId } = renderModal();

    // Click the cancel button
    fireEvent.click(getByTestId('cancelButton'));

    // Check if onCloseModal was called
    expect(defaultProps.onCloseModal).toHaveBeenCalledTimes(1);
  });

  it('should call onConvert with correct lookup index name when convert button is clicked', async () => {
    const { getByTestId } = renderModal();

    // Provide a lookup index name
    fireEvent.change(getByTestId('lookupIndexName'), { target: { value: 'lookup-my-index' } });

    // Click the convert button
    fireEvent.click(getByTestId('convertButton'));

    // Check if onConvert was called with the correct argument
    await waitFor(() => {
      expect(defaultProps.onConvert).toHaveBeenCalledWith('lookup-my-index');
    });
  });
});
