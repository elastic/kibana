/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { DEFAULT_EIS_DISPLAY_OPTIONS } from '../../utils/eis_utils';
import { DisplayOptions } from './display_options';

const renderDisplayOptions = (ui: React.ReactElement) =>
  render(<EuiThemeProvider>{ui}</EuiThemeProvider>);

describe('DisplayOptions', () => {
  it('selects Hide for every option by default and disables Apply', () => {
    const { getByTestId } = renderDisplayOptions(
      <DisplayOptions
        value={DEFAULT_EIS_DISPLAY_OPTIONS}
        onApply={jest.fn()}
        isTourOpen={false}
        onDismissTour={jest.fn()}
      />
    );

    fireEvent.click(getByTestId('eisDisplayOptionsButton'));

    expect(getByTestId('eisDisplayOptionsOutsideRegionPreferencesHide')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(getByTestId('eisDisplayOptionsEndOfLifeModelsHide')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(getByTestId('eisDisplayOptionsPreviewModelsHide')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(getByTestId('eisDisplayOptionsOutsideRegionPreferences')).toHaveTextContent(
      'Models outside your region preferences'
    );
    expect(getByTestId('eisDisplayOptionsOutsideRegionPreferences')).toHaveTextContent(
      "Models that you can't use until you update your region preferences."
    );
    expect(getByTestId('eisDisplayOptionsEndOfLifeModels')).toHaveTextContent('End-of-life models');
    expect(getByTestId('eisDisplayOptionsEndOfLifeModels')).toHaveTextContent(
      "Models that you can't use because they have reached end of life."
    );
    expect(getByTestId('eisDisplayOptionsPreviewModels')).toHaveTextContent(
      'Models in preview are not recommended for production use.'
    );
    expect(getByTestId('eisDisplayOptionsApplyButton')).toBeDisabled();
  });

  it('enables Apply after a Show change and commits on Apply', async () => {
    const onApply = jest.fn();
    const { getByTestId, queryByTestId } = renderDisplayOptions(
      <DisplayOptions
        value={DEFAULT_EIS_DISPLAY_OPTIONS}
        onApply={onApply}
        isTourOpen={false}
        onDismissTour={jest.fn()}
      />
    );

    fireEvent.click(getByTestId('eisDisplayOptionsButton'));
    fireEvent.click(getByTestId('eisDisplayOptionsPreviewModelsShow'));

    expect(getByTestId('eisDisplayOptionsApplyButton')).toBeEnabled();

    fireEvent.click(getByTestId('eisDisplayOptionsApplyButton'));

    expect(onApply).toHaveBeenCalledWith({
      ...DEFAULT_EIS_DISPLAY_OPTIONS,
      showPreviewModels: true,
    });
    await waitFor(() => {
      expect(queryByTestId('eisDisplayOptionsApplyButton')).not.toBeInTheDocument();
    });
  });

  it('discards draft changes when the popover is closed without Apply', () => {
    const onApply = jest.fn();
    const { getByTestId } = renderDisplayOptions(
      <DisplayOptions
        value={DEFAULT_EIS_DISPLAY_OPTIONS}
        onApply={onApply}
        isTourOpen={false}
        onDismissTour={jest.fn()}
      />
    );

    fireEvent.click(getByTestId('eisDisplayOptionsButton'));
    fireEvent.click(getByTestId('eisDisplayOptionsEndOfLifeModelsShow'));
    fireEvent.click(getByTestId('eisDisplayOptionsButton'));
    fireEvent.click(getByTestId('eisDisplayOptionsButton'));

    expect(getByTestId('eisDisplayOptionsEndOfLifeModelsHide')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(getByTestId('eisDisplayOptionsApplyButton')).toBeDisabled();
    expect(onApply).not.toHaveBeenCalled();
  });
});
