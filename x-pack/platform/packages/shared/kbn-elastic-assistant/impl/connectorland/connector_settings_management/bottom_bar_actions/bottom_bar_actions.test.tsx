/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { BottomBarActions } from './bottom_bar_actions';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

describe('bottom_bar_actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function Providers({ children }: { children: React.ReactNode }) {
    return (
      <IntlProvider locale="en" messages={{}}>
        {children}
      </IntlProvider>
    );
  }

  it('renders correctly', () => {
    const onDiscardChanges = jest.fn();
    const onSave = jest.fn();
    render(
      <BottomBarActions
        isLoading={true}
        onDiscardChanges={onDiscardChanges}
        onSave={onSave}
        unsavedChangesCount={5}
        saveLabel="Save Changes"
        appTestSubj="genAiSettings"
      />,
      { wrapper: Providers }
    );

    expect(screen.getByTestId('genAiSettingsBottomBar')).toBeInTheDocument();
    expect(screen.getByText('5 unsaved changes')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Discard changes')).toBeInTheDocument();

    expect(onDiscardChanges).not.toHaveBeenCalled();
    screen.getByText('Discard changes').click();
    expect(onDiscardChanges).toHaveBeenCalled();

    expect(onSave).not.toHaveBeenCalled();
  });
});
