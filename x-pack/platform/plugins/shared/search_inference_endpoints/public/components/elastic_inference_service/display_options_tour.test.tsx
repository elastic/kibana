/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { DisplayOptionsTour } from './display_options_tour';

const renderTour = (ui: React.ReactElement) =>
  render(
    <EuiThemeProvider>
      <I18nProvider>{ui}</I18nProvider>
    </EuiThemeProvider>
  );

describe('DisplayOptionsTour', () => {
  it('does not render the close control when the tour is closed', () => {
    const { queryByTestId, getByTestId } = renderTour(
      <DisplayOptionsTour isOpen={false} onDismiss={jest.fn()}>
        <button type="button" data-test-subj="eisDisplayOptionsTourAnchor" />
      </DisplayOptionsTour>
    );

    expect(getByTestId('eisDisplayOptionsTourAnchor')).toBeInTheDocument();
    expect(queryByTestId('eisDisplayOptionsTourCloseButton')).not.toBeInTheDocument();
  });

  it('calls onDismiss from Close when the tour is open', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderTour(
      <DisplayOptionsTour isOpen={true} onDismiss={onDismiss}>
        <button type="button" data-test-subj="eisDisplayOptionsTourAnchor" />
      </DisplayOptionsTour>
    );

    fireEvent.click(getByTestId('eisDisplayOptionsTourCloseButton'));
    expect(onDismiss).toHaveBeenCalled();
  });
});
