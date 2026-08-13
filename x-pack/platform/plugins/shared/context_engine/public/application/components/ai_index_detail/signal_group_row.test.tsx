/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SignalGroupRow } from './signal_group_row';

const renderRow = (onView = jest.fn()) => {
  render(
    <I18nProvider>
      <EuiProvider>
        <SignalGroupRow group={{ tag: 'query_error', count: 7 }} onView={onView} />
      </EuiProvider>
    </I18nProvider>
  );
  return onView;
};

describe('SignalGroupRow', () => {
  it('renders the humanized tag, its description, and the signal count', () => {
    renderRow();
    expect(screen.getByText('Query error')).toBeInTheDocument();
    expect(screen.getByText(/failed against the target index/i)).toBeInTheDocument();
    expect(screen.getByTestId('contextSignalGroupCount')).toHaveTextContent('7 signals');
  });

  it('invokes onView when the card is clicked', () => {
    const onView = renderRow();
    fireEvent.click(screen.getByTestId('contextSignalGroupRow'));
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it('invokes onView once (not twice) when the View details button is clicked', () => {
    const onView = renderRow();
    fireEvent.click(screen.getByTestId('contextSignalGroupViewDetailsButton'));
    // stopPropagation prevents the bubbled panel click from double-firing.
    expect(onView).toHaveBeenCalledTimes(1);
  });
});
