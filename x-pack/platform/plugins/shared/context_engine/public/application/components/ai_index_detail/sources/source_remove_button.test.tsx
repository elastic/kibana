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
import { SourceRemoveButton } from './source_remove_button';

const renderButton = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('SourceRemoveButton', () => {
  it('uses an aria-label that includes the source label', () => {
    renderButton(
      <SourceRemoveButton label="Google Drive" sourceType="connector" onRemove={jest.fn()} />
    );

    expect(screen.getByRole('button', { name: 'Remove Google Drive' })).toBeInTheDocument();
  });

  it('calls onRemove when clicked', () => {
    const onRemove = jest.fn();
    renderButton(<SourceRemoveButton label="FROM logs-*" sourceType="esql" onRemove={onRemove} />);

    fireEvent.click(screen.getByTestId('contextRemoveSourceButton'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('does not call onRemove when disabled', () => {
    const onRemove = jest.fn();
    renderButton(<SourceRemoveButton label="Google Drive" onRemove={onRemove} disabled />);

    fireEvent.click(screen.getByTestId('contextRemoveSourceButton'));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByTestId('contextRemoveSourceButton')).toBeDisabled();
  });
});
